// The stall itself: the back wall, the counters, and every station with what is on it
// (the boiling pot, the coal grill, the broth kettle, the rice cooker, the board, the bowls,
// the crates and the serve window looking out on Lantern Pier).
import { CHOP_STROKES, FONT, LAYOUT, PALETTE } from './config.js';
import { CRATE_ORDER, INGREDIENTS, recipeMatching } from './menu.js';
import { cookerSlotRect, cookProgress, crateRect, isOpen } from './kitchen.js';
import { drawBowl, drawIngredient, roundRect } from './food-art.js';
import { ticketForBowl } from './orders.js';

const KEYS = { pot: 'A', grill: 'S', kettle: 'D', rice: 'G', board: 'F', trash: 'B', window: 'ENTER' };
const BOWL_KEYS = ['Z', 'X', 'C'];

/** The whole kitchen for one frame. `hover` is the target under the mouse, `t` the clock in seconds. */
export function drawKitchen(ctx, kitchen, t, hover) {
  drawWalls(ctx, t, kitchen);
  drawPot(ctx, kitchen, t);
  drawGrill(ctx, kitchen, t);
  drawKettle(ctx, t);
  drawRiceCooker(ctx, kitchen);
  drawBoard(ctx, kitchen);
  drawBowlSpots(ctx, kitchen, t);
  drawTrash(ctx);
  drawCrates(ctx, kitchen);
  drawServeWindow(ctx, kitchen, t);
  drawDropSpots(ctx, kitchen, t);
  if (hover) drawHover(ctx, hover, t);
}

/** The places that would take what the cook is holding, outlined in soft green. */
export function dropSpotsFor(kitchen) {
  const hand = kitchen.hand;
  if (!hand) return [];
  if (hand.type === 'bowl') {
    const spots = [LAYOUT.trash];
    if (recipeMatching(hand.bowl.items)) spots.push(LAYOUT.window);
    LAYOUT.bowls.forEach((rect, index) => kitchen.bowls[index] === null && spots.push(rect));
    return spots;
  }
  const item = hand.item;
  if (item.stage === 'ruined') return [LAYOUT.trash];
  if (item.stage === 'raw') {
    const prep = INGREDIENTS[item.kind].prep;
    return [prep === 'chop' ? LAYOUT.board : LAYOUT[prep], LAYOUT.trash];
  }
  const bowls = LAYOUT.bowls.filter((rect, index) => kitchen.bowls[index] && !kitchen.bowls[index].items.includes(item.kind));
  return [...bowls, LAYOUT.trash];
}

function drawDropSpots(ctx, kitchen, t) {
  ctx.setLineDash([10, 6]);
  ctx.lineDashOffset = -t * 30;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(108,192,74,0.85)';
  for (const rect of dropSpotsFor(kitchen)) {
    roundRect(ctx, rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, 12);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawWalls(ctx, t, kitchen) {
  ctx.fillStyle = PALETTE.nightDeep;
  ctx.fillRect(0, 0, 1280, 720);
  const wall = ctx.createLinearGradient(0, 60, 0, 430);
  wall.addColorStop(0, '#2b1a14');
  wall.addColorStop(1, '#3d2619');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 60, 892, 372);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2;
  for (let x = 0; x < 892; x += 44) {
    ctx.beginPath();
    ctx.moveTo(x, 60);
    ctx.lineTo(x, 232);
    ctx.stroke();
  }
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 37; col += 1) {
      const x = col * 24 + (row % 2) * 12;
      ctx.fillStyle = (row + col) % 5 === 0 ? '#2a6f6a' : '#e9dcc0';
      ctx.fillRect(x + 1, 232 + row * 24 + 1, 22, 22);
    }
  }
  ctx.fillStyle = 'rgba(20,12,30,0.35)';
  ctx.fillRect(0, 232, 892, 196);
  drawLanternString(ctx, 0, 892, 78, t, kitchen.rush);
  const counter = ctx.createLinearGradient(0, 424, 0, 604);
  counter.addColorStop(0, PALETTE.woodLight);
  counter.addColorStop(1, PALETTE.wood);
  ctx.fillStyle = counter;
  ctx.fillRect(0, 424, 892, 182);
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(0, 424, 892, 6);
  ctx.fillStyle = '#2a170e';
  ctx.fillRect(0, 604, 892, 116);
  ctx.fillStyle = PALETTE.night;
  ctx.fillRect(892, 60, 388, 660);
}

/** Paper lanterns strung along the wall; they flare red during a rush. */
function drawLanternString(ctx, x0, x1, y, t, rush) {
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  for (let x = x0; x <= x1; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.02) * 6);
  ctx.stroke();
  for (let x = x0 + 30; x < x1; x += 110) {
    const yy = y + Math.sin(x * 0.02) * 6 + 4;
    const sway = Math.sin(t * 1.6 + x) * 0.06;
    ctx.save();
    ctx.translate(x, yy);
    ctx.rotate(sway);
    const glow = ctx.createRadialGradient(0, 10, 2, 0, 10, 34);
    glow.addColorStop(0, rush ? 'rgba(255,90,60,0.55)' : 'rgba(255,190,90,0.35)');
    glow.addColorStop(1, 'rgba(255,150,80,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-34, -24, 68, 68);
    ctx.fillStyle = rush ? '#ff5a3c' : PALETTE.lantern;
    ctx.beginPath();
    ctx.ellipse(0, 10, 11, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.amber;
    ctx.fillRect(-6, -4, 12, 3);
    ctx.fillRect(-6, 22, 12, 3);
    ctx.restore();
  }
}

/** A station's name plate with its key, at the top-left of `rect`. */
function stationLabel(ctx, rect, text, key) {
  ctx.font = `bold 12px ${FONT}`;
  const w = ctx.measureText(text).width + (key ? 30 + key.length * 8 : 14);
  roundRect(ctx, rect.x + 6, rect.y + 6, w, 20, 6);
  ctx.fillStyle = 'rgba(21,18,42,0.82)';
  ctx.fill();
  ctx.fillStyle = PALETTE.cream;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, rect.x + 13, rect.y + 16.5);
  if (key) keyCap(ctx, rect.x + w - 6 - Math.max(16, key.length * 7 + 8) / 2, rect.y + 16, key);
}

/** A small keyboard key drawn with its letter. */
export function keyCap(ctx, x, y, key) {
  ctx.font = `bold 11px ${FONT}`;
  const w = Math.max(16, ctx.measureText(key).width + 8);
  roundRect(ctx, x - w / 2, y - 8, w, 16, 4);
  ctx.fillStyle = PALETTE.amber;
  ctx.fill();
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(key, x, y + 0.5);
}

/** A ring around a cooking slot: green while cooking, gold when done, flashing red before it is ruined. */
function drawCookRing(ctx, x, y, item, t) {
  const { cooking, danger } = cookProgress(item);
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.stroke();
  let color = PALETTE.green;
  if (item.stage === 'ready') color = danger > 0 ? (Math.sin(t * 22) > 0 ? PALETTE.red : PALETTE.amberLight) : PALETTE.amber;
  if (item.stage === 'ruined') color = '#555';
  ctx.strokeStyle = color;
  ctx.beginPath();
  const amount = item.stage === 'raw' ? cooking : 1 - danger;
  ctx.arc(x, y, 16, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, amount));
  ctx.stroke();
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = item.stage === 'ready' && danger > 0 ? PALETTE.red : PALETTE.cream;
  ctx.fillText(item.stage === 'raw' ? '' : item.stage === 'ready' ? (danger > 0 ? '!' : '✓') : '✕', x, y + 1);
  if (danger > 0 && item.stage === 'ready') {
    ctx.font = `bold 12px ${FONT}`;
    ctx.fillStyle = PALETTE.red;
    ctx.fillText(item.kind === 'noodles' ? 'SOGGY SOON' : 'BURNING!', x, y - 26);
  }
}

function drawPot(ctx, kitchen, t) {
  const rect = LAYOUT.pot;
  stationPlate(ctx, rect);
  const cx = rect.x + rect.w / 2;
  const top = rect.y + 92;
  const body = ctx.createLinearGradient(rect.x + 14, 0, rect.x + rect.w - 14, 0);
  body.addColorStop(0, PALETTE.steelDark);
  body.addColorStop(0.35, PALETTE.steelLight);
  body.addColorStop(1, PALETTE.steelDark);
  roundRect(ctx, rect.x + 18, top, rect.w - 36, 78, 14);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.fillStyle = '#1c1f2a';
  ctx.fillRect(rect.x + 8, top + 18, 14, 10);
  ctx.fillRect(rect.x + rect.w - 22, top + 18, 14, 10);
  ctx.beginPath();
  ctx.ellipse(cx, top, rect.w / 2 - 18, 18, 0, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.steelLight;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, top + 2, rect.w / 2 - 26, 13, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#9cc7d0';
  ctx.fill();
  for (let i = 0; i < 8; i += 1) {
    const bx = cx + Math.sin(t * 3 + i * 1.7) * (rect.w / 2 - 40);
    const by = top + 2 + Math.cos(t * 2.3 + i) * 6;
    ctx.beginPath();
    ctx.arc(bx, by, 2 + ((t * 4 + i) % 1) * 2.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  kitchen.pot.forEach((item, slot) => {
    const s = cookerSlotRect('pot', slot);
    const x = s.x + s.w / 2;
    ctx.strokeStyle = '#2b2f3c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 20, top - 6);
    ctx.lineTo(x - 30, top - 52);
    ctx.stroke();
    if (!item) {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(x, top - 4, 34, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }
    const bob = Math.sin(t * 5 + slot) * 1.5;
    drawIngredient(ctx, item.kind, item.stage === 'raw' && item.cooked < 0.6 ? 'raw' : item.stage === 'ruined' ? 'ruined' : 'ready', x, top - 10 + bob, 64);
    ctx.strokeStyle = '#3a3f4f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, top - 2, 36, 11, 0, 0, Math.PI);
    ctx.stroke();
    drawCookRing(ctx, x + 40, rect.y + 46, item, t);
  });
  stationLabel(ctx, rect, 'NOODLE POT', KEYS.pot);
}

function drawGrill(ctx, kitchen, t) {
  const rect = LAYOUT.grill;
  stationPlate(ctx, rect);
  const open = isOpen(kitchen, 'grill');
  const top = rect.y + 70;
  roundRect(ctx, rect.x + 12, top, rect.w - 24, 100, 10);
  ctx.fillStyle = '#20181a';
  ctx.fill();
  if (open) {
    const coals = ctx.createLinearGradient(0, top + 40, 0, top + 96);
    coals.addColorStop(0, `rgba(255,${120 + Math.sin(t * 7) * 30},40,0.95)`);
    coals.addColorStop(1, 'rgba(120,20,10,0.9)');
    ctx.fillStyle = coals;
    ctx.fillRect(rect.x + 20, top + 40, rect.w - 40, 52);
    for (let i = 0; i < 14; i += 1) {
      const fx = rect.x + 28 + i * ((rect.w - 56) / 13);
      const fh = 10 + Math.abs(Math.sin(t * 9 + i * 1.3)) * 14;
      ctx.fillStyle = i % 2 ? 'rgba(255,200,80,0.85)' : 'rgba(255,110,40,0.85)';
      ctx.beginPath();
      ctx.moveTo(fx - 6, top + 44);
      ctx.quadraticCurveTo(fx, top + 44 - fh * 1.4, fx + 6, top + 44);
      ctx.fill();
    }
  }
  ctx.strokeStyle = '#6b6f7d';
  ctx.lineWidth = 4;
  for (let i = 0; i < 9; i += 1) {
    const x = rect.x + 24 + i * ((rect.w - 48) / 8);
    ctx.beginPath();
    ctx.moveTo(x, top + 10);
    ctx.lineTo(x, top + 46);
    ctx.stroke();
  }
  ctx.fillStyle = '#6b6f7d';
  ctx.fillRect(rect.x + 18, top + 8, rect.w - 36, 4);
  ctx.fillRect(rect.x + 18, top + 44, rect.w - 36, 4);
  kitchen.grill.forEach((item, slot) => {
    const s = cookerSlotRect('grill', slot);
    const x = s.x + s.w / 2;
    if (!item) return;
    drawIngredient(ctx, item.kind, item.stage, x, top + 26, 70);
    drawCookRing(ctx, x, rect.y + 46, item, t);
  });
  stationLabel(ctx, rect, 'COAL GRILL', KEYS.grill);
  if (!open) lockedOverlay(ctx, rect, 'Lights on Shift 2');
}

function drawKettle(ctx, t) {
  const rect = LAYOUT.kettle;
  stationPlate(ctx, rect);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + 118;
  ctx.fillStyle = '#1c1f2a';
  ctx.fillRect(cx - 44, cy + 44, 88, 12);
  const clay = ctx.createRadialGradient(cx - 18, cy - 14, 6, cx, cy, 60);
  clay.addColorStop(0, '#c9773f');
  clay.addColorStop(1, '#6e3519');
  ctx.beginPath();
  ctx.ellipse(cx, cy, 52, 46, 0, 0, Math.PI * 2);
  ctx.fillStyle = clay;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy - 40, 34, 9, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#e2a14a';
  ctx.fill();
  ctx.strokeStyle = PALETTE.cream;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 30, 0.3, Math.PI - 0.3);
  ctx.stroke();
  ctx.font = `bold 11px ${FONT}`;
  ctx.fillStyle = PALETTE.cream;
  ctx.textAlign = 'center';
  ctx.fillText('MOON', cx, cy - 6);
  ctx.fillText('BROTH', cx, cy + 8);
  ctx.strokeStyle = PALETTE.steelLight;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx + 18, cy - 40);
  ctx.lineTo(cx + 38, cy - 78 + Math.sin(t * 2) * 2);
  ctx.stroke();
  stationLabel(ctx, rect, 'BROTH', KEYS.kettle);
}

function drawRiceCooker(ctx, kitchen) {
  const rect = LAYOUT.rice;
  stationPlate(ctx, rect);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + 118;
  roundRect(ctx, cx - 50, cy - 30, 100, 80, 22);
  ctx.fillStyle = '#f2ede3';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy - 30, 50, 16, 0, Math.PI, 0);
  ctx.fillStyle = PALETTE.lantern;
  ctx.fill();
  ctx.fillStyle = PALETTE.lanternDark;
  ctx.fillRect(cx - 12, cy - 50, 24, 8);
  ctx.fillStyle = PALETTE.ink;
  roundRect(ctx, cx - 22, cy + 6, 44, 18, 5);
  ctx.fill();
  ctx.fillStyle = PALETTE.green;
  ctx.beginPath();
  ctx.arc(cx + 12, cy + 15, 4, 0, Math.PI * 2);
  ctx.fill();
  stationLabel(ctx, rect, 'RICE', KEYS.rice);
  if (!isOpen(kitchen, 'rice')) lockedOverlay(ctx, rect, 'Shift 4');
}

function drawBoard(ctx, kitchen) {
  const rect = LAYOUT.board;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2 + 8;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  roundRect(ctx, rect.x + 14, rect.y + 40, rect.w - 22, rect.h - 52, 16);
  ctx.fill();
  const wood = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  wood.addColorStop(0, '#e3b57a');
  wood.addColorStop(1, '#b9824a');
  roundRect(ctx, rect.x + 10, rect.y + 34, rect.w - 22, rect.h - 52, 16);
  ctx.fillStyle = wood;
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,30,0.35)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(rect.x + 24, rect.y + 52 + i * 20);
    ctx.bezierCurveTo(rect.x + 80, rect.y + 46 + i * 20, rect.x + 140, rect.y + 60 + i * 20, rect.x + rect.w - 26, rect.y + 50 + i * 20);
    ctx.stroke();
  }
  const board = kitchen.board;
  if (board) {
    drawIngredient(ctx, board.kind, board.stage, cx - 10, cy, 100);
    if (board.stage === 'raw') {
      for (let i = 0; i < CHOP_STROKES; i += 1) {
        ctx.beginPath();
        ctx.arc(cx - 40 + i * 20, rect.y + rect.h - 30, 6, 0, Math.PI * 2);
        ctx.fillStyle = i < board.strokes ? PALETTE.green : 'rgba(0,0,0,0.35)';
        ctx.fill();
      }
    }
  }
  const lift = board && board.stage === 'raw' ? -18 * Math.max(0, kitchen.knifeLift ?? 0) : 0;
  drawKnife(ctx, rect.x + rect.w - 44, rect.y + 70 + lift);
  stationLabel(ctx, rect, 'BOARD  · SPACE chops', KEYS.board);
}

function drawKnife(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.9);
  ctx.fillStyle = PALETTE.steelLight;
  ctx.beginPath();
  ctx.moveTo(-6, -40);
  ctx.lineTo(10, -40);
  ctx.lineTo(10, 18);
  ctx.lineTo(-6, 26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(-4, 24, 12, 30);
  ctx.restore();
}

function drawBowlSpots(ctx, kitchen, t) {
  LAYOUT.bowls.forEach((rect, index) => {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + 98;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 34, 74, 22, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#c99b5c';
    ctx.fill();
    ctx.strokeStyle = '#8c6235';
    ctx.lineWidth = 1.5;
    for (let i = -3; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 20, cy + 14);
      ctx.lineTo(cx + i * 20, cy + 54);
      ctx.stroke();
    }
    const bowl = kitchen.bowls[index];
    if (bowl) {
      const recipe = recipeMatching(bowl.items);
      const ticket = ticketForBowl(kitchen, recipe);
      const scale = 0.6 + 0.4 * easeOutBack(bowl.appear);
      drawBowl(ctx, cx, cy - 6, 62 * scale, bowl.items, Boolean(ticket));
      if (recipe) bowlTag(ctx, cx, rect.y + 36, ticket ? `#${ticket.id} READY` : recipe.name, Boolean(ticket), t);
      else if (bowl.items.length) bowlTag(ctx, cx, rect.y + 36, `${bowl.items.length} in`, false, t);
    }
    keyCap(ctx, rect.x + 16, rect.y + rect.h - 14, BOWL_KEYS[index]);
  });
}

function bowlTag(ctx, x, y, text, ready, t) {
  ctx.font = `bold 13px ${FONT}`;
  const w = ctx.measureText(text).width + 18;
  const pop = ready ? 1 + Math.sin(t * 6) * 0.04 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  roundRect(ctx, -w / 2, -11, w, 22, 11);
  ctx.fillStyle = ready ? PALETTE.green : 'rgba(21,18,42,0.8)';
  ctx.fill();
  ctx.fillStyle = ready ? PALETTE.ink : PALETTE.cream;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, 1);
  ctx.restore();
}

function easeOutBack(v) {
  const c = 1.7;
  return 1 + (c + 1) * (v - 1) ** 3 + c * (v - 1) ** 2;
}

function drawTrash(ctx) {
  const rect = LAYOUT.trash;
  const cx = rect.x + rect.w / 2;
  const body = ctx.createLinearGradient(cx - 34, 0, cx + 34, 0);
  body.addColorStop(0, PALETTE.steelDark);
  body.addColorStop(0.4, PALETTE.steel);
  body.addColorStop(1, PALETTE.steelDark);
  ctx.beginPath();
  ctx.moveTo(cx - 34, rect.y + 64);
  ctx.lineTo(cx + 34, rect.y + 64);
  ctx.lineTo(cx + 27, rect.y + 150);
  ctx.lineTo(cx - 27, rect.y + 150);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 14, rect.y + 74);
    ctx.lineTo(cx + i * 12, rect.y + 142);
    ctx.stroke();
  }
  roundRect(ctx, cx - 40, rect.y + 52, 80, 14, 6);
  ctx.fillStyle = PALETTE.steelLight;
  ctx.fill();
  stationLabel(ctx, rect, 'BIN', KEYS.trash);
}

function drawCrates(ctx, kitchen) {
  CRATE_ORDER.forEach((kind, index) => {
    const rect = crateRect(index);
    roundRect(ctx, rect.x, rect.y + 8, rect.w, rect.h - 14, 8);
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fill();
    ctx.fillStyle = PALETTE.wood;
    ctx.fillRect(rect.x + 4, rect.y + 54, rect.w - 8, 8);
    ctx.fillRect(rect.x + 4, rect.y + 74, rect.w - 8, 8);
    const info = INGREDIENTS[kind];
    const stage = info.prep === 'none' ? 'ready' : 'raw';
    drawIngredient(ctx, kind, stage, rect.x + rect.w / 2 - 14, rect.y + 38, 58);
    drawIngredient(ctx, kind, stage, rect.x + rect.w / 2 + 16, rect.y + 44, 52);
    ctx.font = `bold 12px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.cream;
    ctx.fillText(info.name.toUpperCase(), rect.x + 30, rect.y + 89);
    keyCap(ctx, rect.x + 16, rect.y + 89, info.key);
    if (!isOpen(kitchen, kind)) lockedOverlay(ctx, rect, kind === 'pork' ? 'Shift 2' : 'Shift 3');
  });
}

/** The hatch onto Lantern Pier: customers wait outside, finished bowls sit on the shelf. */
function drawServeWindow(ctx, kitchen, t) {
  const rect = LAYOUT.window;
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
  const waiting = kitchen.orders.tickets.length;
  for (let i = 0; i < waiting; i += 1) {
    const px = rect.x + 50 + i * 78;
    const py = rect.y + 168 + Math.sin(t * 3 + i * 2) * 1.5;
    ctx.fillStyle = '#0e0b1f';
    ctx.beginPath();
    ctx.arc(px, py - 54, 15, 0, Math.PI * 2);
    ctx.fill();
    roundRect(ctx, px - 22, py - 38, 44, 50, 16);
    ctx.fill();
    if (kitchen.orders.tickets[i].critic) {
      ctx.fillStyle = PALETTE.amber;
      ctx.fillRect(px - 16, py - 74, 32, 6);
      ctx.fillRect(px - 10, py - 84, 20, 10);
    }
  }
  ctx.fillStyle = PALETTE.lanternDark;
  ctx.fillRect(rect.x - 6, rect.y - 4, rect.w + 12, 14);
  for (let i = 0; i < 10; i += 1) {
    ctx.fillStyle = i % 2 ? PALETTE.cream : PALETTE.lantern;
    ctx.beginPath();
    const sx = rect.x - 6 + i * ((rect.w + 12) / 10);
    const sw = (rect.w + 12) / 10;
    ctx.moveTo(sx, rect.y + 10);
    ctx.lineTo(sx + sw, rect.y + 10);
    ctx.lineTo(sx + sw, rect.y + 26);
    ctx.quadraticCurveTo(sx + sw / 2, rect.y + 36, sx, rect.y + 26);
    ctx.fill();
  }
  ctx.strokeStyle = PALETTE.lanternDark;
  ctx.lineWidth = 10;
  ctx.strokeRect(rect.x - 1, rect.y + 4, rect.w + 2, rect.h - 4);
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

function stationPlate(ctx, rect) {
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fillStyle = 'rgba(13,11,28,0.45)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,217,138,0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function lockedOverlay(ctx, rect, text) {
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fillStyle = 'rgba(13,11,28,0.72)';
  ctx.fill();
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillStyle = PALETTE.amberLight;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🔒 ' + text, rect.x + rect.w / 2, rect.y + rect.h / 2);
}

function drawHover(ctx, rect, t) {
  roundRect(ctx, rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4, 12);
  ctx.strokeStyle = `rgba(255,217,138,${0.55 + Math.sin(t * 8) * 0.25})`;
  ctx.lineWidth = 3;
  ctx.stroke();
}
