// The screens around service: the title on Lantern Pier with the night's six shifts,
// the card that opens each shift, the pause card, the closing tally and the night's end.
import { FONT, FONT_TITLE, PALETTE } from './config.js';
import { recipesForShift } from './menu.js';
import { pressureLine, SHIFTS, starsFor } from './shifts.js';
import { drawBowl, roundRect } from './food-art.js';
import { drawMoonMark, drawStar } from './hud.js';
import { keyCap } from './kitchen-art.js';

function text(ctx, value, x, y, size, color, align = 'left', weight = 'bold', family = FONT) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

/** Where each shift's row sits on the title, for clicks. */
export function titleShiftRect(index) {
  return { x: 60, y: 300 + index * 58, w: 560, h: 50 };
}

/** The pier at night behind the title: sky, moon, water, lantern strings and the stall's awning. */
function drawPier(ctx, t) {
  const sky = ctx.createLinearGradient(0, 0, 0, 720);
  sky.addColorStop(0, '#120f2b');
  sky.addColorStop(0.6, '#2c2152');
  sky.addColorStop(1, '#4a2a4f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1280, 720);
  for (let i = 0; i < 60; i += 1) {
    const sx = (i * 197) % 1280;
    const sy = (i * 89) % 300;
    ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.3 * Math.sin(t * 2 + i)})`;
    ctx.fillRect(sx, sy, 2, 2);
  }
  const glow = ctx.createRadialGradient(1010, 150, 20, 1010, 150, 220);
  glow.addColorStop(0, 'rgba(255,240,200,0.35)');
  glow.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(700, 0, 580, 420);
  ctx.fillStyle = '#fff3c9';
  ctx.beginPath();
  ctx.arc(1010, 150, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(230,210,160,0.5)';
  [[985, 130, 12], [1030, 175, 9], [1040, 120, 6]].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#1a1433';
  ctx.fillRect(0, 600, 1280, 120);
  for (let i = 0; i < 18; i += 1) {
    ctx.fillStyle = `rgba(255,200,120,${0.15 + 0.1 * Math.sin(t * 1.5 + i)})`;
    ctx.fillRect((i * 83 + t * 12) % 1280, 630 + (i % 4) * 18, 40, 2);
  }
  for (let row = 0; row < 2; row += 1) {
    const y = 40 + row * 50;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= 1280; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.01 + row) * 14);
    ctx.stroke();
    for (let x = 40 + row * 60; x < 1280; x += 120) {
      const yy = y + Math.sin(x * 0.01 + row) * 14 + 14;
      const lg = ctx.createRadialGradient(x, yy, 2, x, yy, 30);
      lg.addColorStop(0, 'rgba(255,120,80,0.5)');
      lg.addColorStop(1, 'rgba(255,120,80,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(x - 30, yy - 30, 60, 60);
      ctx.fillStyle = x % 240 < 120 ? PALETTE.lantern : PALETTE.amber;
      ctx.beginPath();
      ctx.ellipse(x, yy, 10, 13, Math.sin(t + x) * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The title: the name, the pier, a steaming Full Moon bowl and the six shifts to pick from. */
export function drawTitle(ctx, progress, selected, t, muted) {
  drawPier(ctx, t);
  drawMoonMark(ctx, 90, 156);
  ctx.save();
  ctx.shadowColor = 'rgba(245,181,74,0.6)';
  ctx.shadowBlur = 24;
  text(ctx, 'MOONBROTH', 120, 150, 92, PALETTE.amber, 'left', 'bold', FONT_TITLE);
  ctx.restore();
  text(ctx, 'A night-market noodle stall on Lantern Pier', 126, 214, 22, PALETTE.cream, 'left', 'italic', FONT_TITLE);
  text(ctx, 'Six shifts, one night. Boil, char, chop and ladle your way to the lantern-lit crowd.', 126, 248, 15, PALETTE.amberLight, 'left', 'normal');
  SHIFTS.forEach((shift, index) => {
    const rect = titleShiftRect(index);
    const open = index < progress.unlocked;
    const active = index === selected;
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
    ctx.fillStyle = active ? 'rgba(245,181,74,0.24)' : 'rgba(13,11,28,0.62)';
    ctx.fill();
    ctx.strokeStyle = active ? PALETTE.amber : 'rgba(255,217,138,0.2)';
    ctx.lineWidth = active ? 3 : 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rect.x + 28, rect.y + 25, 16, 0, Math.PI * 2);
    ctx.fillStyle = open ? PALETTE.lantern : PALETTE.steelDark;
    ctx.fill();
    text(ctx, String(shift.number), rect.x + 28, rect.y + 26, 16, PALETTE.cream, 'center');
    text(ctx, shift.name, rect.x + 56, rect.y + 17, 18, open ? PALETTE.cream : PALETTE.steel, 'left', 'bold', FONT_TITLE);
    text(ctx, `${shift.time} · ${open ? '+ ' + shift.adds : 'locked: earn a star on the shift before'}`, rect.x + 56, rect.y + 37, 12, open ? PALETTE.amberLight : PALETTE.steel, 'left', 'normal');
    const best = progress.stars[index] ?? 0;
    for (let s = 0; s < 3; s += 1) drawStar(ctx, rect.x + rect.w - 64 + s * 22, rect.y + 25, 9, s < best);
  });
  drawBowl(ctx, 1000, 470, 150, ['noodles', 'broth', 'pork', 'shrimp', 'scallion'], true);
  for (let i = 0; i < 5; i += 1) {
    const phase = (t * 0.4 + i * 0.2) % 1;
    ctx.fillStyle = `rgba(255,255,255,${0.22 * (1 - phase)})`;
    ctx.beginPath();
    ctx.arc(930 + i * 36 + Math.sin(t * 2 + i) * 10, 400 - phase * 160, 20 + phase * 20, 0, Math.PI * 2);
    ctx.fill();
  }
  text(ctx, 'FULL MOON · pork, shrimp, scallion, noodles, moon broth', 1000, 660, 13, PALETTE.amberLight, 'center', 'normal');
  roundRect(ctx, 60, 660, 560, 40, 12);
  ctx.fillStyle = PALETTE.lantern;
  ctx.fill();
  text(ctx, `▶  ENTER  open Shift ${selected + 1}`, 340, 681, 18, PALETTE.cream, 'center');
  text(ctx, `↑ ↓ choose shift · click a shift · M sound ${muted ? 'off' : 'on'}`, 340, 714, 12, PALETTE.amberLight, 'center', 'normal');
}

function card(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8,6,18,0.62)';
  ctx.fillRect(0, 0, 1280, 720);
  roundRect(ctx, x, y, w, h, 18);
  ctx.fillStyle = '#211c42';
  ctx.fill();
  ctx.strokeStyle = PALETTE.amber;
  ctx.lineWidth = 3;
  ctx.stroke();
}

/** The card before a shift: what it adds, the menu with each bowl drawn, and the star goals. */
export function drawIntro(ctx, shift, t) {
  card(ctx, 200, 110, 880, 500);
  text(ctx, `SHIFT ${shift.number} OF 6 · ${shift.time}`, 640, 150, 15, PALETTE.amberLight, 'center');
  text(ctx, shift.name, 640, 196, 48, PALETTE.cream, 'center', 'bold', FONT_TITLE);
  roundRect(ctx, 360, 228, 560, 34, 10);
  ctx.fillStyle = 'rgba(226,81,59,0.3)';
  ctx.fill();
  text(ctx, `NEW TONIGHT · ${shift.adds}`, 640, 246, 16, '#ffc6b8', 'center');
  text(ctx, shift.tip, 640, 280, 15, PALETTE.cream, 'center', 'italic');
  text(ctx, pressureLine(shift), 640, 302, 12, PALETTE.amberLight, 'center', 'normal');
  const menu = recipesForShift(shift.number);
  const span = Math.min(140, 800 / menu.length);
  menu.forEach((recipe, index) => {
    const x = 640 - ((menu.length - 1) * span) / 2 + index * span;
    drawBowl(ctx, x, 360, 46, recipe.items, recipe.shift === shift.number);
    text(ctx, recipe.name, x, 432, 14, recipe.shift === shift.number ? PALETTE.amber : PALETTE.cream, 'center');
    text(ctx, `${recipe.value}¢`, x, 452, 12, PALETTE.amberLight, 'center', 'normal');
  });
  shift.stars.forEach((needed, index) => {
    const x = 520 + index * 120;
    drawStar(ctx, x, 498, 14, true);
    text(ctx, `${needed}¢`, x, 524, 14, PALETTE.cream, 'center');
  });
  const pulse = 0.7 + Math.sin(t * 4) * 0.3;
  text(ctx, 'ENTER or click to open the stall', 640, 576, 20, `rgba(247,234,208,${pulse})`, 'center');
}

export function drawPause(ctx, muted) {
  card(ctx, 420, 220, 440, 280);
  text(ctx, 'PAUSED', 640, 270, 44, PALETTE.cream, 'center', 'bold', FONT_TITLE);
  const rows = [['P', 'back to the stall'], ['R', 'restart this shift'], ['ESC', 'leave for the title'], ['M', muted ? 'sound is off' : 'sound is on']];
  rows.forEach(([key, label], index) => {
    keyCap(ctx, 540, 330 + index * 38, key);
    text(ctx, label, 570, 330 + index * 38, 17, PALETTE.amberLight, 'left', 'normal');
  });
}

/** The closing tally for a shift: stars, tips and what went wrong. */
export function drawResults(ctx, kitchen, t, isLast) {
  const stars = starsFor(kitchen.shift, kitchen.score);
  card(ctx, 300, 110, 680, 500);
  text(ctx, `SHIFT ${kitchen.shift.number} · ${kitchen.shift.name.toUpperCase()} · CLOSED`, 640, 150, 15, PALETTE.amberLight, 'center');
  const verdict = ['The pier went hungry', 'A fair night', 'The crowd is talking', 'Legend of Lantern Pier'][stars];
  text(ctx, verdict, 640, 196, 40, PALETTE.cream, 'center', 'bold', FONT_TITLE);
  for (let s = 0; s < 3; s += 1) {
    const pop = s < stars ? 1 + Math.max(0, Math.sin(t * 3 - s)) * 0.08 : 1;
    drawStar(ctx, 560 + s * 80, 262, 30 * pop, s < stars);
  }
  text(ctx, `${kitchen.score}¢`, 640, 330, 52, PALETTE.amber, 'center');
  const rows = [
    ['Bowls served', kitchen.served],
    ['Walked out', kitchen.missed],
    ['Burnt or soggy', kitchen.burnt],
    ['Wrong bowls', kitchen.wrong],
    ['Best combo', `x${kitchen.bestCombo}`],
  ];
  rows.forEach(([label, value], index) => {
    const y = 384 + index * 30;
    text(ctx, label, 470, y, 17, PALETTE.cream, 'left', 'normal');
    text(ctx, String(value), 810, y, 17, PALETTE.amberLight, 'right');
  });
  const next = stars > 0 ? (isLast ? 'ENTER  see the night end' : 'ENTER  next shift') : 'ENTER  try again (one star opens the next shift)';
  text(ctx, next, 640, 554, 18, PALETTE.cream, 'center');
  text(ctx, 'R retry · ESC title', 640, 584, 13, PALETTE.amberLight, 'center', 'normal');
}

/** The end of the night after Festival Night. */
export function drawFinale(ctx, progress, t) {
  drawPier(ctx, t);
  card(ctx, 290, 150, 700, 420);
  text(ctx, 'THE LANTERNS GO OUT', 640, 210, 44, PALETTE.amber, 'center', 'bold', FONT_TITLE);
  text(ctx, 'Grandma Tam counts the tips and hangs up her ladle.', 640, 256, 17, PALETTE.cream, 'center', 'italic');
  const total = progress.stars.reduce((sum, value) => sum + (value ?? 0), 0);
  for (let s = 0; s < 18; s += 1) drawStar(ctx, 418 + (s % 9) * 55, 320 + Math.floor(s / 9) * 50, 16, s < total);
  text(ctx, `${total} of 18 stars on Lantern Pier`, 640, 430, 22, PALETTE.cream, 'center');
  drawBowl(ctx, 640, 490, 40, ['noodles', 'broth', 'pork', 'shrimp', 'scallion'], true);
  text(ctx, 'ENTER  back to the title', 640, 548, 16, PALETTE.amberLight, 'center');
}
