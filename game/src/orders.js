// The order rail: dealing tickets from the shift's menu, running down their patience,
// and handing over the right ticket when a bowl is served.
import { TICKET } from './config.js';
import { recipesForShift, RECIPES } from './menu.js';
import { spawnIntervalAt } from './shifts.js';

const MISS_PENALTY = 15;
const RUSH_SPAWN_SPEEDUP = 2.2;
const CRITIC_PATIENCE = 0.6;

/** An empty rail; the first ticket arrives a moment after the shift opens. */
export function createOrders() {
  return { tickets: [], nextIn: 1.2, counter: 0 };
}

/** A ticket for `recipe`, its patience set by the shift and the size of the bowl. */
function dealTicket(kitchen, recipe, critic) {
  const orders = kitchen.orders;
  orders.counter += 1;
  const base = kitchen.shift.patience + recipe.items.length * 4;
  const patience = critic ? base * CRITIC_PATIENCE : base;
  const ticket = { id: orders.counter, recipe, patience, maxPatience: patience, critic, age: 0, slot: orders.tickets.length };
  orders.tickets.push(ticket);
  kitchen.events.push({ type: 'ticket', x: 120 + orders.tickets.length * 210, y: 150, critic });
  return ticket;
}

/** Pick the next recipe: the shift's newest bowls come up twice as often. */
function chooseRecipe(kitchen) {
  const menu = recipesForShift(kitchen.shift.number);
  const weights = menu.map((recipe) => (recipe.shift === kitchen.shift.number ? 2 : 1));
  let roll = kitchen.random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let index = 0; index < menu.length; index += 1) {
    roll -= weights[index];
    if (roll < 0) return menu[index];
  }
  return menu[menu.length - 1];
}

/** Run the rail for `dt` seconds: patience drains, late tickets walk off, new ones arrive. */
export function stepOrders(kitchen, dt, teaching) {
  const orders = kitchen.orders;
  for (const ticket of orders.tickets) {
    ticket.age += dt;
    ticket.slot += (orders.tickets.indexOf(ticket) - ticket.slot) * Math.min(1, dt * 10);
  }
  if (teaching) {
    if (orders.tickets.length === 0 && kitchen.served === 0) dealTicket(kitchen, RECIPES[0], false);
    return;
  }
  for (const ticket of orders.tickets) ticket.patience -= dt;
  const late = orders.tickets.filter((ticket) => ticket.patience <= 0);
  for (const ticket of late) {
    kitchen.missed += 1;
    kitchen.combo = 0;
    kitchen.score = Math.max(0, kitchen.score - MISS_PENALTY);
    kitchen.events.push({ type: 'missed', x: 120 + orders.tickets.indexOf(ticket) * 220, y: 160, text: `-${MISS_PENALTY}` });
  }
  orders.tickets = orders.tickets.filter((ticket) => ticket.patience > 0);
  orders.nextIn -= dt * (kitchen.rush ? RUSH_SPAWN_SPEEDUP : 1);
  if (orders.nextIn <= 0 && orders.tickets.length < TICKET.max) {
    const criticChance = 0.18 + 0.27 * Math.min(1, kitchen.elapsed / kitchen.shift.seconds);
    const critic = kitchen.shift.critics && kitchen.elapsed > 15 && kitchen.random() < criticChance;
    dealTicket(kitchen, chooseRecipe(kitchen), critic);
    orders.nextIn = orders.tickets.length === 1 ? 2.5 : spawnIntervalAt(kitchen.shift, kitchen.elapsed);
  }
}

/** Remove and return the most urgent ticket asking for `recipe`, or null. */
export function takeTicketFor(kitchen, recipe) {
  const orders = kitchen.orders;
  let best = null;
  for (const ticket of orders.tickets) {
    if (ticket.recipe !== recipe) continue;
    if (!best || ticket.patience < best.patience) best = ticket;
  }
  if (best) orders.tickets.splice(orders.tickets.indexOf(best), 1);
  return best;
}

/** The ticket a bowl holding `kinds` is heading for: same recipe, most urgent; or null. */
export function ticketForBowl(kitchen, recipe) {
  if (!recipe) return null;
  let best = null;
  for (const ticket of kitchen.orders.tickets) {
    if (ticket.recipe === recipe && (!best || ticket.patience < best.patience)) best = ticket;
  }
  return best;
}
