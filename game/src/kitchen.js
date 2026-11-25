// The rules of the kitchen: what the cook holds, what each station does when you use it,
// how food cooks and burns, and what serving a bowl at the window earns. No drawing here:
// every change worth seeing or hearing is pushed to `kitchen.events` for the effects and audio.
import {
  BOWL_MAX_ITEMS, CHOP_STROKES, COMBO_MAX, GRILL_SLOTS, HOLD_SECONDS, LAYOUT, PICKUP_SECONDS,
  POT_SLOTS, RUIN_SECONDS, RUSH_TIP_MULTIPLIER,
} from './config.js';
import { CRATE_ORDER, INGREDIENTS, recipeMatching } from './menu.js';
import { createOrders, stepOrders, takeTicketFor } from './orders.js';
import { rushAt, shiftHas } from './shifts.js';
import { createTutorial, stepTutorial } from './tutorial.js';
import { createRandom } from './random.js';

/** A fresh kitchen at the start of `shift`, dealing tickets from `seed`. */
export function createKitchen(shift, seed) {
  const kitchen = {
    shift,
    random: createRandom(seed),
    elapsed: 0,
    timeLeft: shift.seconds,
    score: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    missed: 0,
    burnt: 0,
    wrong: 0,
    hand: null,
    pot: new Array(POT_SLOTS).fill(null),
    grill: new Array(GRILL_SLOTS).fill(null),
    board: null,
    bowls: LAYOUT.bowls.map(() => newBowl()),
    shelf: [],
    rush: null,
    over: false,
    events: [],
    orders: null,
    tutorial: null,
  };
  kitchen.orders = createOrders(kitchen);
  kitchen.tutorial = shift.tutorial ? createTutorial() : null;
  return kitchen;
}

/** An empty bowl; `appear` runs 0 to 1 as it slides onto the counter. */
function newBowl() {
  return { items: [], appear: 0 };
}

/** A raw (or ready, when it needs no prep) ingredient of `kind`. */
function newItem(kind) {
  const prep = INGREDIENTS[kind].prep;
  return { kind, stage: prep === 'none' ? 'ready' : 'raw', cooked: 0, held: 0, strokes: 0 };
}

function emit(kitchen, type, x, y, extra) {
  kitchen.events.push({ type, x, y, ...extra });
}

function centerOf(rect) {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

/** Is the station or crate called `feature` open on this shift? */
export function isOpen(kitchen, feature) {
  return shiftHas(kitchen.shift, feature);
}

/**
 * Use one place in the kitchen with whatever the cook holds. Targets: crate:<kind>, pot,
 * pot:<slot>, grill, grill:<slot>, kettle, rice, board, bowl:<index>, window, trash.
 * Returns true when something happened.
 */
export function useTarget(kitchen, target) {
  if (kitchen.over) return false;
  const [place, arg] = target.split(':');
  if (place === 'crate') return useCrate(kitchen, arg);
  if (place === 'pot' || place === 'grill') return useCooker(kitchen, place, arg === undefined ? -1 : Number(arg));
  if (place === 'kettle') return useSource(kitchen, 'broth', LAYOUT.kettle);
  if (place === 'rice') return useSource(kitchen, 'rice', LAYOUT.rice);
  if (place === 'board') return useBoard(kitchen);
  if (place === 'bowl') return useBowl(kitchen, Number(arg));
  if (place === 'window') return serveAtWindow(kitchen);
  if (place === 'trash') return useTrash(kitchen);
  return false;
}

function holdingItem(kitchen) {
  return kitchen.hand && kitchen.hand.type === 'item' ? kitchen.hand.item : null;
}

function holdingBowl(kitchen) {
  return kitchen.hand && kitchen.hand.type === 'bowl' ? kitchen.hand.bowl : null;
}

function refuse(kitchen, rect, text) {
  const at = centerOf(rect);
  emit(kitchen, 'refuse', at.x, at.y - 30, { text });
  return false;
}

function useCrate(kitchen, kind) {
  const index = CRATE_ORDER.indexOf(kind);
  const rect = crateRect(index);
  if (!isOpen(kitchen, kind)) return refuse(kitchen, rect, 'Opens later tonight');
  const held = holdingItem(kitchen);
  if (held && held.kind === kind && held.stage === newItem(kind).stage && held.cooked === 0) {
    kitchen.hand = null;
    emit(kitchen, 'drop', rect.x + rect.w / 2, rect.y + 30);
    return true;
  }
  const bowl = holdingBowl(kitchen);
  if (bowl && INGREDIENTS[kind].prep === 'none') return addToBowl(kitchen, bowl, newItem(kind), rect);
  if (kitchen.hand) return refuse(kitchen, rect, 'Hands full');
  kitchen.hand = { type: 'item', item: newItem(kind) };
  emit(kitchen, 'pick', rect.x + rect.w / 2, rect.y + 30, { kind });
  return true;
}

/** The kettle and rice cooker: always ready, nothing to cook. */
function useSource(kitchen, kind, rect) {
  if (!isOpen(kitchen, kind)) return refuse(kitchen, rect, 'Opens on Shift 4');
  const bowl = holdingBowl(kitchen);
  if (bowl) return addToBowl(kitchen, bowl, newItem(kind), rect);
  const held = holdingItem(kitchen);
  if (held && held.kind === kind) {
    kitchen.hand = null;
    emit(kitchen, 'drop', rect.x + rect.w / 2, rect.y + 60);
    return true;
  }
  if (kitchen.hand) return refuse(kitchen, rect, 'Hands full');
  kitchen.hand = { type: 'item', item: newItem(kind) };
  emit(kitchen, kind === 'broth' ? 'ladle' : 'scoop', rect.x + rect.w / 2, rect.y + 60, { kind });
  return true;
}

/** Where slot `slot` of the pot or grill sits on screen. */
export function cookerSlotRect(place, slot) {
  const rect = LAYOUT[place];
  const count = place === 'pot' ? POT_SLOTS : GRILL_SLOTS;
  const w = (rect.w - 20) / count;
  return { x: rect.x + 10 + slot * w, y: rect.y + 34, w: w - 4, h: rect.h - 44 };
}

function useCooker(kitchen, place, slot) {
  const slots = kitchen[place];
  const rect = LAYOUT[place];
  if (place === 'grill' && !isOpen(kitchen, 'grill')) return refuse(kitchen, rect, 'Grill lights on Shift 2');
  const held = holdingItem(kitchen);
  if (held) {
    if (INGREDIENTS[held.kind].prep !== place || held.stage !== 'raw') {
      return refuse(kitchen, rect, place === 'pot' ? 'Only noodles boil' : 'Only pork and shrimp grill');
    }
    const free = slot >= 0 && slots[slot] === null ? slot : slots.indexOf(null);
    if (free < 0) return refuse(kitchen, rect, 'No free spot');
    slots[free] = held;
    kitchen.hand = null;
    const at = centerOf(cookerSlotRect(place, free));
    emit(kitchen, place === 'pot' ? 'splash' : 'sizzle', at.x, at.y, { kind: held.kind });
    return true;
  }
  const chosen = chooseCookerSlot(slots, slot);
  if (chosen < 0) return refuse(kitchen, rect, 'Nothing cooking');
  const item = slots[chosen];
  const at = centerOf(cookerSlotRect(place, chosen));
  const bowl = holdingBowl(kitchen);
  if (bowl) {
    if (item.stage !== 'ready') return refuse(kitchen, rect, item.stage === 'raw' ? 'Not done yet' : 'Ruined: bin it');
    if (!addToBowl(kitchen, bowl, item, rect)) return false;
    slots[chosen] = null;
    return true;
  }
  if (kitchen.hand) return refuse(kitchen, rect, 'Hands full');
  slots[chosen] = null;
  kitchen.hand = { type: 'item', item };
  emit(kitchen, 'pick', at.x, at.y, { kind: item.kind });
  return true;
}

/** The slot the cook means: the one clicked if it holds food, else the readiest one. */
function chooseCookerSlot(slots, slot) {
  if (slot >= 0 && slots[slot]) return slot;
  const order = ['ready', 'ruined', 'raw'];
  for (const stage of order) {
    const index = slots.findIndex((item) => item && item.stage === stage);
    if (index >= 0) return index;
  }
  return -1;
}

function useBoard(kitchen) {
  const rect = LAYOUT.board;
  const held = holdingItem(kitchen);
  const board = kitchen.board;
  if (held) {
    if (board) return refuse(kitchen, rect, 'Board is busy');
    if (INGREDIENTS[held.kind].prep !== 'chop' || held.stage !== 'raw') return refuse(kitchen, rect, 'Only scallion is chopped');
    kitchen.board = held;
    kitchen.hand = null;
    emit(kitchen, 'drop', rect.x + rect.w / 2, rect.y + rect.h / 2);
    return true;
  }
  if (!board) return refuse(kitchen, rect, 'Bring scallion here');
  if (board.stage === 'raw') return chopStroke(kitchen);
  const bowl = holdingBowl(kitchen);
  if (bowl) {
    if (!addToBowl(kitchen, bowl, board, rect)) return false;
    kitchen.board = null;
    return true;
  }
  if (kitchen.hand) return refuse(kitchen, rect, 'Hands full');
  kitchen.hand = { type: 'item', item: board };
  kitchen.board = null;
  emit(kitchen, 'pick', rect.x + rect.w / 2, rect.y + rect.h / 2, { kind: board.kind });
  return true;
}

/** One knife stroke on whatever raw item is on the board (Space or a click). */
export function chopStroke(kitchen) {
  const board = kitchen.board;
  if (kitchen.over || !board || board.stage !== 'raw') return false;
  board.strokes += 1;
  const rect = LAYOUT.board;
  const x = rect.x + rect.w / 2 + 20;
  const y = rect.y + rect.h / 2 + 6;
  if (board.strokes >= CHOP_STROKES) {
    board.stage = 'ready';
    emit(kitchen, 'chopDone', x, y, { kind: board.kind });
  } else {
    emit(kitchen, 'chop', x, y, { kind: board.kind, strokes: board.strokes });
  }
  return true;
}

function addToBowl(kitchen, bowl, item, fromRect) {
  const rect = bowlRectFor(kitchen, bowl) ?? fromRect;
  if (item.stage === 'raw') return refuse(kitchen, rect, INGREDIENTS[item.kind].prep === 'chop' ? 'Chop it first' : 'Cook it first');
  if (item.stage === 'ruined') return refuse(kitchen, rect, 'Ruined: bin it');
  if (bowl.items.includes(item.kind)) return refuse(kitchen, rect, 'Already in the bowl');
  if (bowl.items.length >= BOWL_MAX_ITEMS) return refuse(kitchen, rect, 'Bowl is full');
  bowl.items.push(item.kind);
  bowl.pop = 1;
  if (holdingItem(kitchen) === item) kitchen.hand = null;
  const at = centerOf(rect);
  emit(kitchen, 'plate', at.x, at.y - 10, { kind: item.kind, ready: recipeMatching(bowl.items) !== null });
  return true;
}

function bowlRectFor(kitchen, bowl) {
  const index = kitchen.bowls.indexOf(bowl);
  return index >= 0 ? LAYOUT.bowls[index] : null;
}

function useBowl(kitchen, index) {
  const rect = LAYOUT.bowls[index];
  const bowl = kitchen.bowls[index];
  const carried = holdingBowl(kitchen);
  if (!bowl) {
    if (!carried) return refuse(kitchen, rect, 'Empty spot');
    kitchen.bowls[index] = carried;
    kitchen.hand = null;
    emit(kitchen, 'drop', rect.x + rect.w / 2, rect.y + rect.h / 2);
    return true;
  }
  const held = holdingItem(kitchen);
  if (held) return addToBowl(kitchen, bowl, held, rect);
  if (carried) return refuse(kitchen, rect, 'Spot taken');
  if (bowl.items.length === 0) return refuse(kitchen, rect, 'Fill it first');
  kitchen.hand = { type: 'bowl', bowl, from: index };
  kitchen.bowls[index] = null;
  emit(kitchen, 'pick', rect.x + rect.w / 2, rect.y + rect.h / 2, { kind: 'bowl' });
  return true;
}

function useTrash(kitchen) {
  const rect = LAYOUT.trash;
  const at = centerOf(rect);
  if (!kitchen.hand) {
    const ruinedPot = kitchen.pot.findIndex((item) => item && item.stage === 'ruined');
    const ruinedGrill = kitchen.grill.findIndex((item) => item && item.stage === 'ruined');
    if (ruinedPot < 0 && ruinedGrill < 0) return refuse(kitchen, rect, 'Nothing to bin');
    if (ruinedPot >= 0) kitchen.pot[ruinedPot] = null;
    else kitchen.grill[ruinedGrill] = null;
    emit(kitchen, 'trash', at.x, at.y);
    return true;
  }
  const bowl = holdingBowl(kitchen);
  if (bowl) {
    bowl.items = [];
    returnBowl(kitchen, bowl, kitchen.hand.from);
  }
  kitchen.hand = null;
  kitchen.combo = 0;
  emit(kitchen, 'trash', at.x, at.y);
  return true;
}

function returnBowl(kitchen, bowl, from) {
  const spot = kitchen.bowls[from] === null ? from : kitchen.bowls.indexOf(null);
  if (spot >= 0) kitchen.bowls[spot] = bowl;
}

/** Ring the held bowl out at the window: it pays the matching ticket, or bounces back. */
function serveAtWindow(kitchen) {
  const rect = LAYOUT.window;
  const bowl = holdingBowl(kitchen);
  if (!bowl) return refuse(kitchen, rect, holdingItem(kitchen) ? 'Plate it in a bowl first' : 'Bring a finished bowl');
  const recipe = recipeMatching(bowl.items);
  const ticket = recipe ? takeTicketFor(kitchen, recipe) : null;
  if (!ticket) {
    kitchen.combo = 0;
    kitchen.wrong += 1;
    return refuse(kitchen, rect, recipe ? 'Nobody ordered that' : 'Not on the menu');
  }
  const from = kitchen.hand.from;
  kitchen.hand = null;
  kitchen.combo = Math.min(COMBO_MAX, kitchen.combo + 1);
  kitchen.bestCombo = Math.max(kitchen.bestCombo, kitchen.combo);
  const points = pointsFor(kitchen, recipe, ticket);
  kitchen.score += points;
  kitchen.served += 1;
  kitchen.shelf.push({ bowl, recipe, ticket, timer: PICKUP_SECONDS });
  kitchen.bowls[from] === null ? (kitchen.bowls[from] = newBowl()) : returnBowl(kitchen, newBowl(), from);
  emit(kitchen, 'serve', rect.x + rect.w / 2, rect.y + 150, { points, combo: kitchen.combo, critic: ticket.critic, slot: ticket.slot, id: ticket.id, name: recipe.name });
  return true;
}

/** Dish value plus a tip for speed, raised by rush and critics, multiplied by the combo. */
export function pointsFor(kitchen, recipe, ticket) {
  const speed = Math.max(0, ticket.patience / ticket.maxPatience);
  let tip = recipe.value * 0.6 * speed;
  if (kitchen.rush) tip *= RUSH_TIP_MULTIPLIER;
  if (ticket.critic) tip *= 3;
  const comboBonus = 1 + (kitchen.combo - 1) * 0.15;
  return Math.round((recipe.value + tip) * comboBonus);
}

/** Advance the kitchen by `dt` seconds: cooking, burning, tickets, the rush and the clock. */
export function stepKitchen(kitchen, dt) {
  if (kitchen.over) return;
  stepCooker(kitchen, 'pot', dt);
  stepCooker(kitchen, 'grill', dt);
  for (const bowl of kitchen.bowls) {
    if (!bowl) continue;
    if (bowl.appear < 1) bowl.appear = Math.min(1, bowl.appear + dt * 4);
    if (bowl.pop > 0) bowl.pop = Math.max(0, bowl.pop - dt * 4);
  }
  for (const plate of kitchen.shelf) plate.timer -= dt;
  kitchen.shelf = kitchen.shelf.filter((plate) => plate.timer > 0);
  const teaching = kitchen.tutorial && !kitchen.tutorial.done;
  if (kitchen.tutorial) stepTutorial(kitchen);
  stepOrders(kitchen, dt, teaching);
  if (teaching) return;
  kitchen.elapsed += dt;
  kitchen.timeLeft = Math.max(0, kitchen.shift.seconds - kitchen.elapsed);
  const rush = rushAt(kitchen.shift, kitchen.elapsed);
  if (rush && !kitchen.rush) emit(kitchen, 'rushStart', 640, 300);
  if (!rush && kitchen.rush) emit(kitchen, 'rushEnd', 640, 300);
  kitchen.rush = rush;
  const whole = Math.ceil(kitchen.timeLeft);
  if (whole <= 10 && whole !== kitchen.lastTick && whole > 0) emit(kitchen, 'tick', 640, 30, { seconds: whole });
  kitchen.lastTick = whole;
  if (kitchen.timeLeft <= 0) {
    kitchen.over = true;
    emit(kitchen, 'shiftOver', 640, 360);
  }
}

function stepCooker(kitchen, place, dt) {
  const slots = kitchen[place];
  for (let slot = 0; slot < slots.length; slot += 1) {
    const item = slots[slot];
    if (!item) continue;
    const at = centerOf(cookerSlotRect(place, slot));
    if (item.stage === 'raw') {
      item.cooked += dt;
      if (item.cooked >= INGREDIENTS[item.kind].cook) {
        item.stage = 'ready';
        emit(kitchen, 'done', at.x, at.y - 30, { kind: item.kind });
      }
    } else if (item.stage === 'ready') {
      item.held += dt;
      if (item.held >= HOLD_SECONDS && item.held - dt < HOLD_SECONDS) emit(kitchen, 'warn', at.x, at.y - 30, { place });
      if (item.held >= RUIN_SECONDS) {
        item.stage = 'ruined';
        kitchen.burnt += 1;
        kitchen.combo = 0;
        emit(kitchen, 'burn', at.x, at.y - 30, { place });
      }
    }
  }
}

/** 0 to 1 over the cooking, then 0 to 1 over the warning: how a slot's ring is drawn. */
export function cookProgress(item) {
  if (item.stage === 'raw') return { cooking: item.cooked / INGREDIENTS[item.kind].cook, danger: 0 };
  if (item.stage === 'ready') return { cooking: 1, danger: Math.max(0, (item.held - HOLD_SECONDS) / (RUIN_SECONDS - HOLD_SECONDS)) };
  return { cooking: 1, danger: 1 };
}

/** Where crate `index` sits along the front counter. */
export function crateRect(index) {
  const row = LAYOUT.crateRow;
  return { x: row.x + index * (136 + 10), y: row.y, w: 136, h: row.h };
}

/** Every clickable place and its target name, for the mouse. */
export function clickTargets() {
  const targets = [];
  CRATE_ORDER.forEach((kind, index) => targets.push({ rect: crateRect(index), target: `crate:${kind}` }));
  for (let slot = 0; slot < POT_SLOTS; slot += 1) targets.push({ rect: cookerSlotRect('pot', slot), target: `pot:${slot}` });
  for (let slot = 0; slot < GRILL_SLOTS; slot += 1) targets.push({ rect: cookerSlotRect('grill', slot), target: `grill:${slot}` });
  targets.push({ rect: LAYOUT.pot, target: 'pot' }, { rect: LAYOUT.grill, target: 'grill' });
  targets.push({ rect: LAYOUT.kettle, target: 'kettle' }, { rect: LAYOUT.rice, target: 'rice' });
  targets.push({ rect: LAYOUT.board, target: 'board' }, { rect: LAYOUT.trash, target: 'trash' }, { rect: LAYOUT.window, target: 'window' });
  LAYOUT.bowls.forEach((rect, index) => targets.push({ rect, target: `bowl:${index}` }));
  return targets;
}
