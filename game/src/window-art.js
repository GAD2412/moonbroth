// The serve window: the hatch onto Lantern Pier under its striped awning, the customers
// waiting outside (one per ticket, their mood souring with its patience), the brass shelf
// where served bowls wait for the runner, and the order-up bell.
import { FONT, LAYOUT, PALETTE } from './config.js';
import { drawBowl, drawChopsticks, roundRect } from './food-art.js';
import { bowlTag, keyCap } from './labels-art.js';

const COATS = ['#3d6fb0', '#8a4f9e', '#2f8f88', '#b5643a', '#5a6b3d', '#a83a5a'];
const SKIN = ['#f0c29a', '#d79c6e', '#a8704a', '#f6d3b5', '#7a4b2f'];

/** The whole window for one frame. */
export function drawServeWindow(ctx, kitchen, t) {
  const rect = LAYOUT.window;
  drawPierView(ctx, rect, t);
  kitchen.orders.tickets.forEach((ticket, i) => drawCustomer(ctx, ticket, rect.x + 50 + i * 78, rect.y + 168, t));
  drawAwningAndFrame(ctx, rect);
  const shelfY = rect.y + rect.h - 52;
  ctx.fillStyle = '#c99a4a';
  ctx.fillRect(rect.x - 6, shelfY + 26, rect.w + 12, 14);
  ctx.fillStyle = '#8c6526';
  ctx.fillRect(rect.x - 6, shelfY + 40, rect.w + 12, 6);
  drawBell(ctx, rect.x + rect.w - 40, shelfY + 14, kitchen.bellRing ?? 0);
  kitchen.shelf.forEach((plate, index) => {
    const x = rect.x + 80 + index * 110;
    const lift = plate.timer < 0.4 ? (0.4 - plate.timer) * 120 : 0;
    drawBowl(ctx, x, shelfY - 2 - lift, 44, plate.bowl.items, true);
    drawChopsticks(ctx, x + 6, shelfY - 6 - lift, 44);
    bowlTag(ctx, x, shelfY - 52 - lift, `ORDER UP #${plate.ticket.id}`, true, t);
  });
  ctx.font = `bold 12px ${FONT}`;
  roundRect(ctx, rect.x + 10, rect.y + 36, 150, 20, 6);
  ctx.fillStyle = 'rgba(21,18,42,0.82)';
  ctx.fill();
  ctx.fillStyle = PALETTE.cream;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('SERVE WINDOW', rect.x + 18, rect.y + 46.5);
  keyCap(ctx, rect.x + 136, rect.y + 46, 'ENTER');
}

/** Night sky, a crescent moon, the boardwalk and the pier's string lights. */
function drawPierView(ctx, rect, t) {
  const sky = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  sky.addColorStop(0, '#1d1b47');
  sky.addColorStop(1, '#3f2d5e');
  ctx.fillStyle = sky;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = '#fff3c9';
  ctx.beginPath();
  ctx.arc(rect.x + rect.w - 60, rect.y + 68, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d1b47';
  ctx.beginPath();
  ctx.arc(rect.x + rect.w - 50, rect.y + 62, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#16122c';
  ctx.fillRect(rect.x, rect.y + 150, rect.w, 40);
  for (let i = 0; i < 6; i += 1) {
    const lx = rect.x + 20 + i * 62;
    ctx.fillStyle = `rgba(255,${170 + (i % 2) * 40},90,${0.6 + Math.sin(t * 2 + i) * 0.2})`;
    ctx.beginPath();
    ctx.arc(lx, rect.y + 46 + Math.sin(i) * 6, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The red lacquer frame and the scalloped red and cream awning. */
function drawAwningAndFrame(ctx, rect) {
  ctx.fillStyle = PALETTE.lanternDark;
  ctx.fillRect(rect.x - 6, rect.y - 4, rect.w + 12, 14);
  const sw = (rect.w + 12) / 10;
  for (let i = 0; i < 10; i += 1) {
    const sx = rect.x - 6 + i * sw;
    ctx.fillStyle = i % 2 ? PALETTE.cream : PALETTE.lantern;
    ctx.beginPath();
    ctx.moveTo(sx, rect.y + 10);
    ctx.lineTo(sx + sw, rect.y + 10);
    ctx.lineTo(sx + sw, rect.y + 26);
    ctx.quadraticCurveTo(sx + sw / 2, rect.y + 36, sx, rect.y + 26);
    ctx.fill();
  }
  ctx.strokeStyle = PALETTE.lanternDark;
  ctx.lineWidth = 10;
  ctx.strokeRect(rect.x - 1, rect.y + 4, rect.w + 2, rect.h - 4);
}

/**
 * One customer waiting outside the window for `ticket`: their face sours as the ticket's
 * patience runs down, and critics wear a gold hat.
 */
function drawCustomer(ctx, ticket, x, baseY, t) {
  const mood = ticket.patience / ticket.maxPatience;
  const fidget = mood < 0.25 ? Math.sin(t * 18 + ticket.id) * 2 : Math.sin(t * 2 + ticket.id) * 1;
  const y = baseY + fidget;
  ctx.fillStyle = COATS[ticket.id % COATS.length];
  roundRect(ctx, x - 24, y - 40, 48, 54, 18);
  ctx.fill();
  ctx.fillStyle = SKIN[(ticket.id * 3) % SKIN.length];
  ctx.beginPath();
  ctx.arc(x, y - 58, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(x - 8, y - 62, 4, 4);
  ctx.fillRect(x + 4, y - 62, 4, 4);
  ctx.strokeStyle = PALETTE.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (mood > 0.5) ctx.arc(x, y - 54, 6, 0.2, Math.PI - 0.2);
  else if (mood > 0.25) {
    ctx.moveTo(x - 5, y - 50);
    ctx.lineTo(x + 5, y - 50);
  } else ctx.arc(x, y - 44, 6, Math.PI + 0.3, -0.3);
  ctx.stroke();
  if (mood <= 0.25) {
    ctx.fillStyle = '#9fd4ff';
    ctx.beginPath();
    ctx.ellipse(x + 15, y - 66, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (ticket.critic) {
    ctx.fillStyle = PALETTE.amber;
    ctx.fillRect(x - 18, y - 76, 36, 5);
    ctx.fillRect(x - 11, y - 90, 22, 15);
    ctx.fillStyle = PALETTE.lanternDark;
    ctx.fillRect(x - 11, y - 79, 22, 3);
  } else {
    ctx.fillStyle = ['#2a2033', '#5b3a22', '#1d1b47'][ticket.id % 3];
    ctx.beginPath();
    ctx.arc(x, y - 64, 17, Math.PI, 0);
    ctx.fill();
  }
  const tagY = y - 104 + (ticket.critic ? -6 : 0);
  roundRect(ctx, x - 16, tagY, 32, 16, 6);
  ctx.fillStyle = 'rgba(247,234,208,0.9)';
  ctx.fill();
  ctx.font = `bold 10px ${FONT}`;
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`#${ticket.id}`, x, tagY + 8);
}

/** The brass order-up bell; it wobbles when a bowl is rung out. */
function drawBell(ctx, x, y, ring) {
  const wobble = Math.sin(ring * 40) * ring * 0.3;
  ctx.save();
  ctx.translate(x, y + 12);
  ctx.rotate(wobble);
  ctx.fillStyle = PALETTE.amber;
  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.quadraticCurveTo(-16, -22, 0, -22);
  ctx.quadraticCurveTo(16, -22, 16, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.amberLight;
  ctx.fillRect(-3, -28, 6, 6);
  ctx.restore();
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(x - 20, y + 12, 40, 5);
}
