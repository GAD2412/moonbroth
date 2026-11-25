// What the cook reads at a glance: the top bar (name, shift, the big clock, score, combo),
// the ticket rail, the rush ribbon, the shift card, the key legend, Grandma Tam's tutorial
// pointer and the food in the cook's hand.
import { COMBO_MAX, FONT, FONT_TITLE, LAYOUT, PALETTE, TICKET } from './config.js';
import { recipeMatching, recipesForShift } from './menu.js';
import { drawBowl, drawIngredient, roundRect } from './food-art.js';
import { keyCap } from './kitchen-art.js';
import { currentTutorialStep } from './tutorial.js';
import { clickTargets } from './kitchen.js';

/** Every HUD layer over the kitchen, in order. */
export function drawHud(ctx, kitchen, t) {
  drawRushRibbon(ctx, kitchen, t);
  drawTopBar(ctx, kitchen, t);
  drawTickets(ctx, kitchen, t);
  if (kitchen.tutorial && !kitchen.tutorial.done) drawTutorial(ctx, kitchen, t);
  else drawShiftCard(ctx, kitchen);
  drawLegend(ctx);
}

function text(ctx, value, x, y, size, color, align = 'left', weight = 'bold', family = FONT) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

export function formatClock(seconds) {
  const whole = Math.ceil(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function drawTopBar(ctx, kitchen, t) {
  const bar = ctx.createLinearGradient(0, 0, 0, 60);
  bar.addColorStop(0, '#2d2656');
  bar.addColorStop(1, '#1b1738');
  ctx.fillStyle = bar;
  ctx.fillRect(0, 0, 1280, 60);
  ctx.fillStyle = PALETTE.amber;
  ctx.fillRect(0, 58, 1280, 2);
  drawMoonMark(ctx, 32, 30);
  text(ctx, 'MOONBROTH', 58, 24, 26, PALETTE.amber, 'left', 'bold', FONT_TITLE);
  text(ctx, `SHIFT ${kitchen.shift.number} · ${kitchen.shift.name.toUpperCase()} · ${kitchen.shift.time}`, 60, 46, 12, PALETTE.cream);
  drawClock(ctx, kitchen, t);
  drawScore(ctx, kitchen, t);
}

/** The crescent-moon-in-a-bowl mark of the stall. */
export function drawMoonMark(ctx, x, y) {
  ctx.fillStyle = PALETTE.amberLight;
  ctx.beginPath();
  ctx.arc(x, y - 4, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2d2656';
  ctx.beginPath();
  ctx.arc(x + 6, y - 8, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.teal;
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 15, 11, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = PALETTE.cream;
  ctx.fillRect(x - 15, y + 2, 30, 3);
}

/** The big shift clock: it pulses and turns red in the last twenty seconds. */
function drawClock(ctx, kitchen, t) {
  const left = kitchen.timeLeft;
  const urgent = left <= 20 && !kitchen.over;
  const pulse = urgent ? 1 + Math.max(0, Math.sin(t * Math.PI * 2)) * 0.08 : 1;
  ctx.save();
  ctx.translate(640, 42);
  ctx.scale(pulse, pulse);
  roundRect(ctx, -92, -38, 184, 80, 18);
  ctx.fillStyle = urgent ? '#5a1620' : '#151230';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = urgent ? PALETTE.red : PALETTE.amber;
  ctx.stroke();
  const teaching = kitchen.tutorial && !kitchen.tutorial.done;
  text(ctx, teaching ? 'PREP' : formatClock(left), 0, -2, 46, urgent ? '#ffd0c8' : PALETTE.cream, 'center', 'bold', FONT);
  const progress = left / kitchen.shift.seconds;
  roundRect(ctx, -70, 26, 140, 8, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  roundRect(ctx, -70, 26, 140 * progress, 8, 4);
  ctx.fillStyle = urgent ? PALETTE.red : PALETTE.amber;
  ctx.fill();
  ctx.restore();
  if (teaching) text(ctx, 'clock starts after your first bowl', 640, 92, 11, PALETTE.amberLight, 'center');
}

function drawScore(ctx, kitchen, t) {
  const x = 900;
  text(ctx, 'TIPS', x, 16, 11, PALETTE.amberLight);
  text(ctx, `${kitchen.score.toLocaleString('en-US')}¢`, x, 38, 28, PALETTE.cream);
  const goal = kitchen.shift.stars[2];
  const barX = x + 130;
  roundRect(ctx, barX, 30, 130, 10, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  roundRect(ctx, barX, 30, 130 * Math.min(1, kitchen.score / goal), 10, 5);
  ctx.fillStyle = PALETTE.amber;
  ctx.fill();
  kitchen.shift.stars.forEach((needed, index) => {
    drawStar(ctx, barX + (130 * needed) / goal, 22, 8, kitchen.score >= needed);
    if (index === 0) text(ctx, 'GOAL', barX, 16, 10, PALETTE.amberLight);
  });
  const combo = kitchen.combo;
  const comboX = 1180;
  const hot = combo >= 3;
  roundRect(ctx, comboX - 10, 8, 96, 44, 10);
  ctx.fillStyle = hot ? '#6b2416' : 'rgba(255,255,255,0.06)';
  ctx.fill();
  if (hot) {
    ctx.strokeStyle = `rgba(255,140,60,${0.6 + Math.sin(t * 10) * 0.3})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  text(ctx, 'COMBO', comboX + 38, 18, 10, PALETTE.amberLight, 'center');
  text(ctx, `x${combo}`, comboX + 38, 38, 24, hot ? '#ffb07a' : PALETTE.cream, 'center');
  for (let i = 0; i < COMBO_MAX; i += 1) {
    ctx.fillStyle = i < combo ? '#ff8a3c' : 'rgba(255,255,255,0.15)';
    ctx.fillRect(comboX - 4 + i * 11, 48, 8, 3);
  }
}

export function drawStar(ctx, x, y, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? PALETTE.amber : 'rgba(255,255,255,0.18)';
  ctx.fill();
  ctx.strokeStyle = filled ? PALETTE.amberLight : 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** A red and gold ribbon under the top bar while a rush wave is on. */
function drawRushRibbon(ctx, kitchen, t) {
  if (!kitchen.rush) return;
  const [, end] = kitchen.rush;
  const left = end - kitchen.elapsed;
  const ribbon = ctx.createLinearGradient(0, 60, 0, 94);
  ribbon.addColorStop(0, '#f05a3a');
  ribbon.addColorStop(1, '#a8261a');
  ctx.fillStyle = ribbon;
  ctx.fillRect(0, 60, 892, 34);
  ctx.fillStyle = PALETTE.amber;
  for (let x = -40 + ((t * 60) % 40); x < 892; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 94);
    ctx.lineTo(x + 20, 94);
    ctx.lineTo(x + 10, 100);
    ctx.fill();
  }
  const flare = 0.75 + Math.sin(t * 8) * 0.25;
  text(ctx, '✦ LANTERN RUSH ✦', 30, 77, 22, `rgba(255,236,190,${flare})`, 'left', 'bold', FONT_TITLE);
  text(ctx, `TIPS x1.5 · ${formatClock(left)}`, 860, 77, 16, PALETTE.cream, 'right');
}

/** The order rail: up to four tickets, each with its bowl, ingredients and patience. */
function drawTickets(ctx, kitchen, t) {
  const rail = LAYOUT.rail;
  ctx.fillStyle = '#b48a3c';
  ctx.fillRect(rail.x, rail.y + 6, rail.w, 6);
  ctx.fillStyle = '#6e5220';
  ctx.fillRect(rail.x, rail.y + 12, rail.w, 2);
  const readyRecipes = readyBowlRecipes(kitchen);
  for (const ticket of kitchen.orders.tickets) {
    const slide = Math.max(0, 1 - ticket.age / 0.35);
    const x = rail.x + ticket.slot * (TICKET.width + TICKET.gap) + slide * 400;
    const ready = readyRecipes.indexOf(ticket.recipe);
    if (ready >= 0) readyRecipes.splice(ready, 1);
    drawTicket(ctx, ticket, x, rail.y + 4, t, ready >= 0);
  }
  if (kitchen.orders.tickets.length === 0) text(ctx, 'The rail is clear: orders are on their way…', rail.x + 20, rail.y + 60, 15, 'rgba(247,234,208,0.6)');
}

/** The recipes of finished bowls on the counter or in hand, one entry per bowl. */
function readyBowlRecipes(kitchen) {
  const carried = kitchen.hand && kitchen.hand.type === 'bowl' ? [kitchen.hand.bowl] : [];
  return [...kitchen.bowls, ...carried].map((bowl) => bowl && recipeMatching(bowl.items)).filter(Boolean);
}

function drawTicket(ctx, ticket, x, y, t, ready) {
  const ratio = Math.max(0, ticket.patience / ticket.maxPatience);
  const shake = ratio < 0.2 ? Math.sin(t * 40) * 1.5 : 0;
  ctx.save();
  ctx.translate(x + shake, y);
  ctx.rotate(Math.sin(ticket.id * 1.7) * 0.015);
  if (ready) {
    roundRect(ctx, -4, 0, TICKET.width + 8, TICKET.height + 8, 9);
    ctx.fillStyle = `rgba(108,192,74,${0.55 + Math.sin(t * 6) * 0.25})`;
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, 4, 8, TICKET.width, TICKET.height, 6);
  ctx.fill();
  roundRect(ctx, 0, 4, TICKET.width, TICKET.height, 6);
  ctx.fillStyle = ticket.critic ? '#ffe39a' : PALETTE.paper;
  ctx.fill();
  ctx.fillStyle = ticket.critic ? '#c98a12' : PALETTE.lantern;
  ctx.fillRect(0, 4, TICKET.width, 28);
  ctx.fillStyle = PALETTE.steelLight;
  ctx.fillRect(TICKET.width / 2 - 14, 0, 28, 10);
  text(ctx, `#${ticket.id}`, 10, 18, 14, PALETTE.cream);
  text(ctx, ticket.recipe.name.toUpperCase(), TICKET.width - 10, 18, 14, PALETTE.cream, 'right');
  if (ticket.critic) text(ctx, '★ CRITIC · TIP x3', 10, 44, 11, '#8a5a00');
  const items = ticket.recipe.items;
  drawBowl(ctx, 36, 70, 24, items, false);
  const step = Math.min(34, 140 / items.length);
  items.forEach((kind, index) => {
    const ix = 82 + index * step;
    ctx.beginPath();
    ctx.arc(ix, 76, 15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(43,32,51,0.12)';
    ctx.fill();
    drawIngredient(ctx, kind, 'ready', ix, 76, 28);
  });
  const barColor = ratio > 0.5 ? PALETTE.green : ratio > 0.25 ? PALETTE.amber : PALETTE.red;
  roundRect(ctx, 10, 104, TICKET.width - 20, 12, 6);
  ctx.fillStyle = 'rgba(43,32,51,0.18)';
  ctx.fill();
  if (ratio > 0.25 || Math.sin(t * 14) > -0.3) {
    roundRect(ctx, 10, 104, (TICKET.width - 20) * ratio, 12, 6);
    ctx.fillStyle = barColor;
    ctx.fill();
  }
  text(ctx, ready ? 'BOWL READY ✓' : `${Math.ceil(ticket.patience)}s`, TICKET.width - 14, 94, 11, ready ? '#3d8a24' : PALETTE.inkSoft, 'right');
  text(ctx, `${ticket.recipe.value}¢`, 10, 94, 11, PALETTE.inkSoft);
  ctx.restore();
}

/** The shift card: the shift's new thing, tonight's menu and the running tally. */
function drawShiftCard(ctx, kitchen) {
  const card = LAYOUT.shiftPanel;
  panel(ctx, card);
  const shift = kitchen.shift;
  text(ctx, `SHIFT ${shift.number} OF 6`, card.x + 16, card.y + 20, 12, PALETTE.amberLight);
  text(ctx, shift.name, card.x + 16, card.y + 42, 22, PALETTE.cream, 'left', 'bold', FONT_TITLE);
  roundRect(ctx, card.x + 12, card.y + 58, card.w - 24, 24, 8);
  ctx.fillStyle = 'rgba(226,81,59,0.25)';
  ctx.fill();
  text(ctx, `NEW · ${shift.adds}`, card.x + 20, card.y + 70, 12, '#ffb9a8');
  text(ctx, "TONIGHT'S MENU", card.x + 16, card.y + 96, 11, PALETTE.amberLight);
  const menu = recipesForShift(shift.number);
  menu.forEach((recipe, index) => {
    const ry = card.y + 114 + index * 21;
    text(ctx, recipe.name, card.x + 16, ry, 13, PALETTE.cream, 'left', 'normal');
    recipe.items.forEach((kind, k) => drawIngredient(ctx, kind, 'ready', card.x + 140 + k * 22, ry, 19));
    text(ctx, `${recipe.value}¢`, card.x + card.w - 16, ry, 12, PALETTE.amberLight, 'right');
  });
  const statsY = card.y + card.h - 18;
  text(ctx, `Served ${kitchen.served}   Walked out ${kitchen.missed}   Burnt ${kitchen.burnt}`, card.x + 16, statsY, 12, PALETTE.cream, 'left', 'normal');
}

function panel(ctx, rect) {
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fillStyle = '#211c42';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,217,138,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawLegend(ctx) {
  const rect = LAYOUT.legend;
  panel(ctx, rect);
  text(ctx, 'Click a station, or press its key, to pick up or put down.', rect.x + 14, rect.y + 20, 12, PALETTE.cream, 'left', 'normal');
  const keys = [['SPACE', 'chop'], ['ENTER', 'serve'], ['B', 'bin'], ['P', 'pause'], ['R', 'restart'], ['M', 'mute']];
  keys.forEach(([key, label], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = rect.x + 34 + col * 118;
    const y = rect.y + 50 + row * 28;
    keyCap(ctx, x, y, key);
    text(ctx, label, x + 26, y, 12, PALETTE.amberLight, 'left', 'normal');
  });
}

/** Grandma Tam's note in the side card, and a bouncing arrow over the place to use next. */
function drawTutorial(ctx, kitchen, t) {
  const step = currentTutorialStep(kitchen);
  if (!step) return;
  const card = LAYOUT.shiftPanel;
  panel(ctx, card);
  drawTam(ctx, card.x + 46, card.y + 62);
  text(ctx, 'GRANDMA TAM', card.x + 90, card.y + 34, 12, PALETTE.amberLight);
  text(ctx, `First shift · step ${kitchen.tutorial.step + 1} of 8`, card.x + 90, card.y + 54, 13, PALETTE.cream, 'left', 'normal');
  wrapText(ctx, step.text, card.x + 18, card.y + 120, card.w - 36, 24, 17);
  text(ctx, 'Your first ticket waits for you. No rush yet.', card.x + 18, card.y + card.h - 22, 12, PALETTE.amberLight, 'left', 'normal');
  const target = clickTargets().find((entry) => entry.target === step.target);
  if (!target) return;
  const bob = Math.sin(t * 6) * 6;
  const ax = target.rect.x + target.rect.w / 2;
  const ay = target.rect.y - 6 + bob;
  roundRect(ctx, target.rect.x - 3, target.rect.y - 3, target.rect.w + 6, target.rect.h + 6, 12);
  ctx.strokeStyle = PALETTE.amber;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = PALETTE.amber;
  ctx.beginPath();
  ctx.moveTo(ax - 16, ay - 24);
  ctx.lineTo(ax + 16, ay - 24);
  ctx.lineTo(ax, ay);
  ctx.closePath();
  ctx.fill();
}

function drawTam(ctx, x, y) {
  ctx.fillStyle = '#d7d3df';
  ctx.beginPath();
  ctx.arc(x, y - 26, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f0c29a';
  ctx.beginPath();
  ctx.arc(x, y - 4, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d7d3df';
  ctx.beginPath();
  ctx.arc(x, y - 14, 22, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(x - 10, y - 4, 5, 2);
  ctx.fillRect(x + 5, y - 4, 5, 2);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y + 4, 7, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.lantern;
  roundRect(ctx, x - 26, y + 18, 52, 22, 8);
  ctx.fill();
}

function wrapText(ctx, value, x, y, width, lineHeight, size) {
  ctx.font = `bold ${size}px ${FONT}`;
  const words = value.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > width && line) {
      text(ctx, line, x, yy, size, PALETTE.cream);
      line = word;
      yy += lineHeight;
    } else line = test;
  }
  if (line) text(ctx, line, x, yy, size, PALETTE.cream);
}

/** The food or bowl in the cook's hand, following the mouse. */
export function drawHand(ctx, kitchen, x, y) {
  const hand = kitchen.hand;
  if (!hand) return;
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x + 6, y + 30, 30, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  if (hand.type === 'bowl') drawBowl(ctx, x, y, 44, hand.bowl.items, false);
  else drawIngredient(ctx, hand.item.kind, hand.item.stage, x, y, 64);
  ctx.restore();
}
