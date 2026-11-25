// The screenshot scenes behind ?shot=cover|title|tutorial|results|intro. Each plays the real
// rules forward from a fresh shift, with an autopilot chef pressing the same targets a player
// would, so every frame is what a real service looks like and one seed gives one frame.
import { STEP } from './config.js';
import { bowlFitsRecipe, INGREDIENTS, recipeMatching } from './menu.js';
import { chopStroke, useTarget } from './kitchen.js';
import { openStall, startShift, updateApp } from './game.js';

const THINK_SECONDS = 0.32;
const CHOP_SECONDS = 0.12;
const SOURCES = { broth: 'kettle', rice: 'rice', chili: 'crate:chili' };

/** Which ticket each bowl is being built for, and what it still lacks. */
function planBowls(kitchen) {
  const tickets = [...kitchen.orders.tickets].sort((a, b) => a.patience - b.patience);
  const used = new Set();
  const plans = [];
  kitchen.bowls.forEach((bowl, index) => {
    if (!bowl || bowl.items.length === 0) return;
    const ticket = tickets.find((entry) => !used.has(entry) && bowlFitsRecipe(bowl.items, entry.recipe));
    if (ticket) used.add(ticket);
    plans.push({ index, bowl, recipe: ticket ? ticket.recipe : null, missing: ticket ? ticket.recipe.items.filter((kind) => !bowl.items.includes(kind)) : [] });
  });
  kitchen.bowls.forEach((bowl, index) => {
    if (!bowl || bowl.items.length > 0) return;
    const ticket = tickets.find((entry) => !used.has(entry));
    if (!ticket) return;
    used.add(ticket);
    plans.push({ index, bowl, recipe: ticket.recipe, missing: [...ticket.recipe.items] });
  });
  return plans;
}

/** How many of `kind` are already on their way (cooking, on the board, or in hand). */
function inProgress(kitchen, kind) {
  const all = [...kitchen.pot, ...kitchen.grill, kitchen.board, kitchen.hand?.type === 'item' ? kitchen.hand.item : null];
  return all.filter((item) => item && item.kind === kind && item.stage !== 'ruined').length;
}

/** The autopilot's next target, or 'chop', or null to wait a moment. */
export function chefAction(kitchen) {
  const plans = planBowls(kitchen);
  const hand = kitchen.hand;
  if (hand && hand.type === 'bowl') {
    const items = hand.bowl.items;
    const recipe = recipeMatching(items);
    const tickets = kitchen.orders.tickets;
    if (recipe && tickets.some((ticket) => ticket.recipe === recipe)) return 'window';
    const stillWanted = tickets.some((ticket) => bowlFitsRecipe(items, ticket.recipe));
    return stillWanted && kitchen.bowls[hand.from] === null ? `bowl:${hand.from}` : 'trash';
  }
  const junk = plans.find((plan) => !plan.recipe);
  if (!hand && junk) return `bowl:${junk.index}`;
  const finished = plans.find((plan) => plan.recipe && plan.missing.length === 0 && kitchen.orders.tickets.some((ticket) => ticket.recipe === plan.recipe));
  if (!hand && finished) return `bowl:${finished.index}`;
  if (hand) {
    const item = hand.item;
    if (item.stage === 'ruined') return 'trash';
    if (item.stage === 'ready') {
      const plan = plans.find((entry) => entry.missing.includes(item.kind));
      return plan ? `bowl:${plan.index}` : 'trash';
    }
    const prep = INGREDIENTS[item.kind].prep;
    if (prep === 'chop') return kitchen.board ? 'trash' : 'board';
    return kitchen[prep].includes(null) ? prep : 'trash';
  }
  for (const place of ['pot', 'grill']) {
    const ruined = kitchen[place].findIndex((item) => item && item.stage === 'ruined');
    if (ruined >= 0) return 'trash';
  }
  const needed = plans.flatMap((plan) => plan.missing);
  for (const place of ['pot', 'grill']) {
    const ready = kitchen[place].findIndex((item) => item && item.stage === 'ready' && needed.includes(item.kind));
    if (ready >= 0) return `${place}:${ready}`;
  }
  if (kitchen.board && kitchen.board.stage === 'raw') return 'chop';
  if (kitchen.board && needed.includes(kitchen.board.kind)) return 'board';
  const source = needed.find((kind) => SOURCES[kind]);
  if (source) return SOURCES[source];
  for (const kind of needed) {
    const prep = INGREDIENTS[kind].prep;
    const want = needed.filter((entry) => entry === kind).length;
    const room = prep === 'chop' ? kitchen.board === null : kitchen[prep].includes(null);
    if (inProgress(kitchen, kind) < want && room) return `crate:${kind}`;
  }
  return null;
}

/** Run the shift forward with the autopilot until `until(kitchen)` holds or `limit` seconds pass. */
function playForward(app, limit, until, think = THINK_SECONDS) {
  const kitchen = app.kitchen;
  let wait = 0;
  for (let time = 0; time < limit; time += STEP) {
    if (until && until(kitchen)) return;
    wait -= STEP;
    if (wait <= 0) {
      const action = chefAction(kitchen);
      if (action === 'chop') {
        chopStroke(kitchen);
        wait = CHOP_SECONDS;
      } else {
        if (action) useTarget(kitchen, action);
        wait = think;
      }
    }
    updateApp(app, STEP);
    if (app.screen !== 'play') return;
  }
}

/** True when every ticket has finished sliding onto the rail. */
function settled(kitchen) {
  return kitchen.orders.tickets.every((ticket) => ticket.age > 0.5);
}

/** Set `app` to the named scene. */
export function stageShot(name, app) {
  if (name === 'title') {
    app.progress = { unlocked: 6, stars: [3, 3, 2, 2, 1] };
    app.selected = 4;
    for (let i = 0; i < 90; i += 1) updateApp(app, STEP);
    return;
  }
  if (name === 'tutorial') {
    startShift(app, 0);
    openStall(app);
    const k = app.kitchen;
    useTarget(k, 'crate:noodles');
    useTarget(k, 'pot');
    playForward(app, 1.5, () => false);
    useTarget(k, 'crate:scallion');
    useTarget(k, 'board');
    for (let i = 0; i < 5; i += 1) chopStroke(k);
    useTarget(k, 'board');
    for (let i = 0; i < 40; i += 1) updateApp(app, STEP);
    app.shotPointer = { x: 330, y: 470 };
    return;
  }
  if (name === 'intro') {
    startShift(app, 5);
    for (let i = 0; i < 60; i += 1) updateApp(app, STEP);
    return;
  }
  if (name === 'results') {
    startShift(app, 3);
    openStall(app);
    playForward(app, 400, () => false, 0.55);
    for (let i = 0; i < 60; i += 1) updateApp(app, STEP);
    return;
  }
  if (name === 'festival') {
    startShift(app, 5);
    openStall(app);
    const burning = (k) => k.grill.some((item) => item && item.stage === 'ready' && item.held > 5.2);
    const critic = (k) => k.orders.tickets.some((ticket) => ticket.critic);
    playForward(app, 170, (k) => k.elapsed > 30 && critic(k) && burning(k) && settled(k) && !app.fx.banner, 0.62);
    app.shotPointer = { x: 700, y: 330 };
    return;
  }
  startShift(app, 4);
  openStall(app);
  const busy = (k) => k.grill.some(Boolean) && k.pot.some(Boolean) && k.bowls.some((bowl) => bowl && bowl.items.length >= 2 && !recipeMatching(bowl.items));
  playForward(app, 140, (k) => k.elapsed > 44 && k.rush && k.orders.tickets.length >= 4 && k.shelf.length > 0 && k.shelf[0].timer < 1.2 && busy(k) && settled(k), 0.42);
  app.shotPointer = { x: 690, y: 500 };
}
