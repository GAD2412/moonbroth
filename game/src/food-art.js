// Food drawn in code: every ingredient raw, ready and ruined, and the glazed bowls they
// are built up in, layer by layer (broth, then rice or noodles, then toppings).
import { PALETTE } from './config.js';

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

/** A wavy noodle strand from (x0, y) across `length`, `waves` bumps of height `amp`. */
function strand(ctx, x0, y, length, amp, waves, phase) {
  ctx.beginPath();
  for (let i = 0; i <= 24; i += 1) {
    const t = i / 24;
    const x = x0 + t * length;
    const yy = y + Math.sin(t * Math.PI * 2 * waves + phase) * amp;
    if (i === 0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.stroke();
}

/** A nest of boiled noodles centred on (x, y), `w` wide. */
export function drawNoodleNest(ctx, x, y, w, ruined) {
  const h = w * 0.42;
  ellipse(ctx, x, y + h * 0.1, w * 0.5, h * 0.55, ruined ? '#8c8576' : '#e9cf86');
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, w * 0.045);
  const rows = 6;
  for (let row = 0; row < rows; row += 1) {
    const t = row / (rows - 1);
    const yy = y - h * 0.32 + t * h * 0.75;
    const span = w * (0.55 + Math.sin(t * Math.PI) * 0.4);
    ctx.strokeStyle = ruined ? '#a49d8c' : row % 2 ? '#fff0b8' : '#f6dc8e';
    strand(ctx, x - span / 2, yy, span, w * 0.035, 3 + (row % 2), row * 1.7);
  }
  if (!ruined) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = Math.max(1, w * 0.02);
    strand(ctx, x - w * 0.2, y - h * 0.2, w * 0.3, w * 0.03, 2, 0.5);
  }
}

/** Raw noodles: a dry bundle tied with a red band. */
function drawRawNoodles(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.25);
  ctx.strokeStyle = '#f1d98f';
  ctx.lineWidth = Math.max(1, s * 0.03);
  for (let i = -6; i <= 6; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, i * s * 0.025);
    ctx.lineTo(s * 0.45, i * s * 0.02);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.lantern;
  ctx.fillRect(-s * 0.06, -s * 0.18, s * 0.12, s * 0.36);
  ctx.restore();
}

/** A slice of pork belly: pink and marbled raw, glazed with char marks when cooked. */
function drawPork(ctx, x, y, s, stage, angle = -0.2) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const w = s * 0.8;
  const h = s * 0.42;
  const meat = stage === 'raw' ? '#e88a8a' : stage === 'ready' ? '#b5562f' : '#2d221e';
  const fat = stage === 'raw' ? '#fbe3d6' : stage === 'ready' ? '#efc58e' : '#4a3a33';
  roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.35);
  ctx.fillStyle = fat;
  ctx.fill();
  roundRect(ctx, -w / 2 + s * 0.04, -h / 2 + s * 0.05, w - s * 0.08, h * 0.38, h * 0.2);
  ctx.fillStyle = meat;
  ctx.fill();
  roundRect(ctx, -w / 2 + s * 0.04, h * 0.05, w - s * 0.08, h * 0.32, h * 0.2);
  ctx.fill();
  if (stage === 'ready') {
    ctx.strokeStyle = 'rgba(60,20,10,0.75)';
    ctx.lineWidth = Math.max(1, s * 0.04);
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * w * 0.25 - h * 0.25, -h * 0.45);
      ctx.lineTo(i * w * 0.25 + h * 0.25, h * 0.45);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,230,180,0.5)';
    ctx.fillRect(-w * 0.3, -h * 0.36, w * 0.3, h * 0.08);
  }
  ctx.restore();
}

/** A curled shrimp: grey-blue raw, coral when grilled, black when burnt. */
function drawShrimp(ctx, x, y, s, stage, flip = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip, 1);
  const body = stage === 'raw' ? '#9fb4c2' : stage === 'ready' ? '#f07b4f' : '#2a2422';
  const stripe = stage === 'raw' ? '#7d93a3' : stage === 'ready' ? '#ffd2b0' : '#3c3330';
  ctx.lineCap = 'round';
  ctx.strokeStyle = body;
  ctx.lineWidth = s * 0.22;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.24, Math.PI * 0.85, Math.PI * 2.25);
  ctx.stroke();
  ctx.strokeStyle = stripe;
  ctx.lineWidth = Math.max(1, s * 0.035);
  for (let i = 0; i < 4; i += 1) {
    const a = Math.PI * (1 + i * 0.28);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * s * 0.15, Math.sin(a) * s * 0.15);
    ctx.lineTo(Math.cos(a) * s * 0.34, Math.sin(a) * s * 0.34);
    ctx.stroke();
  }
  ctx.fillStyle = stage === 'ready' ? '#d9452c' : body;
  ctx.beginPath();
  const tx = Math.cos(Math.PI * 2.25) * s * 0.24;
  const ty = Math.sin(Math.PI * 2.25) * s * 0.24;
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx + s * 0.2, ty + s * 0.02);
  ctx.lineTo(tx + s * 0.1, ty + s * 0.16);
  ctx.fill();
  ctx.restore();
}

/** Scallion: a whole stalk raw, a pile of bright rings once chopped. */
function drawScallion(ctx, x, y, s, stage) {
  if (stage === 'raw') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.35);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#4e9a35';
    ctx.lineWidth = s * 0.1;
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, 0);
    ctx.lineTo(s * 0.45, -s * 0.04);
    ctx.moveTo(0, 0);
    ctx.lineTo(s * 0.42, s * 0.08);
    ctx.stroke();
    ctx.strokeStyle = '#eef3d8';
    ctx.lineWidth = s * 0.13;
    ctx.beginPath();
    ctx.moveTo(-s * 0.42, s * 0.02);
    ctx.lineTo(-s * 0.08, 0);
    ctx.stroke();
    ctx.restore();
    return;
  }
  scatterScallion(ctx, x, y, s * 0.42, s * 0.25, 9, s * 0.07);
}

/** Green scallion rings scattered over an ellipse; seeded by position so they hold still. */
export function scatterScallion(ctx, x, y, rx, ry, count, ring) {
  for (let i = 0; i < count; i += 1) {
    const a = i * 2.39996;
    const d = Math.sqrt((i + 0.5) / count);
    const px = x + Math.cos(a) * rx * d;
    const py = y + Math.sin(a) * ry * d;
    ctx.lineWidth = ring * 0.55;
    ctx.strokeStyle = i % 3 === 0 ? '#9fdc6a' : '#5fb53e';
    ctx.beginPath();
    ctx.ellipse(px, py, ring, ring * 0.7, a, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** A little jar of chili oil, red with floating flakes. */
function drawChiliJar(ctx, x, y, s) {
  roundRect(ctx, x - s * 0.22, y - s * 0.2, s * 0.44, s * 0.48, s * 0.08);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  roundRect(ctx, x - s * 0.19, y - s * 0.06, s * 0.38, s * 0.31, s * 0.06);
  ctx.fillStyle = '#c8321f';
  ctx.fill();
  ctx.fillStyle = '#7a1408';
  for (let i = 0; i < 6; i += 1) ctx.fillRect(x - s * 0.15 + (i * 0.11 % 0.3) * s, y + ((i * 0.37) % 0.25) * s - s * 0.02, s * 0.05, s * 0.03);
  ctx.fillStyle = PALETTE.lanternDark;
  ctx.fillRect(x - s * 0.24, y - s * 0.28, s * 0.48, s * 0.1);
}

/** A ladle of moon broth. */
function drawBrothLadle(ctx, x, y, s) {
  ctx.strokeStyle = PALETTE.steelLight;
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + s * 0.15, y - s * 0.05);
  ctx.lineTo(x + s * 0.45, y - s * 0.4);
  ctx.stroke();
  ellipse(ctx, x - s * 0.05, y, s * 0.3, s * 0.2, PALETTE.steel);
  ellipse(ctx, x - s * 0.05, y - s * 0.03, s * 0.25, s * 0.12, '#e2a14a');
  ellipse(ctx, x - s * 0.12, y - s * 0.06, s * 0.06, s * 0.03, 'rgba(255,240,190,0.8)');
}

/** A white mound of rice with grains catching the light. */
export function drawRiceMound(ctx, x, y, w) {
  const h = w * 0.36;
  ellipse(ctx, x, y, w * 0.5, h * 0.55, '#f4f1e8');
  ellipse(ctx, x - w * 0.06, y - h * 0.18, w * 0.36, h * 0.35, '#ffffff');
  ctx.fillStyle = '#d9d3c2';
  for (let i = 0; i < 14; i += 1) {
    const a = i * 2.4;
    const d = Math.sqrt((i + 0.5) / 14);
    ctx.save();
    ctx.translate(x + Math.cos(a) * w * 0.4 * d, y + Math.sin(a) * h * 0.4 * d);
    ctx.rotate(a);
    ctx.fillRect(-w * 0.025, -w * 0.008, w * 0.05, w * 0.016);
    ctx.restore();
  }
}

/** One ingredient in its stage, about `size` pixels across, centred on (x, y). */
export function drawIngredient(ctx, kind, stage, x, y, size) {
  if (kind === 'noodles') {
    if (stage === 'raw') drawRawNoodles(ctx, x, y, size);
    else drawNoodleNest(ctx, x, y, size * 0.9, stage === 'ruined');
  } else if (kind === 'pork') drawPork(ctx, x, y, size, stage);
  else if (kind === 'shrimp') drawShrimp(ctx, x, y, size, stage);
  else if (kind === 'scallion') drawScallion(ctx, x, y, size, stage);
  else if (kind === 'chili') drawChiliJar(ctx, x, y, size);
  else if (kind === 'broth') drawBrothLadle(ctx, x, y, size);
  else if (kind === 'rice') drawRiceMound(ctx, x, y, size * 0.8);
}

export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * A glazed Moonbroth bowl seen from the front and above, centred on its rim at (x, y), `r`
 * wide each side, holding `items` (ingredient kinds) drawn in layers.
 */
export function drawBowl(ctx, x, y, r, items, glow) {
  const ry = r * 0.4;
  if (glow) {
    const halo = ctx.createRadialGradient(x, y + r * 0.2, r * 0.3, x, y + r * 0.2, r * 1.5);
    halo.addColorStop(0, 'rgba(255,217,138,0.55)');
    halo.addColorStop(1, 'rgba(255,217,138,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(x - r * 1.6, y - r * 1.2, r * 3.2, r * 2.8);
  }
  ellipse(ctx, x, y + r * 0.92, r * 0.75, r * 0.14, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = PALETTE.tealDark;
  ctx.fillRect(x - r * 0.32, y + r * 0.66, r * 0.64, r * 0.2);
  const body = ctx.createLinearGradient(x - r, y, x + r, y + r);
  body.addColorStop(0, PALETTE.tealLight);
  body.addColorStop(0.5, PALETTE.teal);
  body.addColorStop(1, PALETTE.tealDark);
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.78, 0, 0, Math.PI);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = PALETTE.cream;
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.beginPath();
  for (let i = 0; i <= 30; i += 1) {
    const t = i / 30;
    const px = x - r * 0.9 + t * r * 1.8;
    const curve = Math.sqrt(Math.max(0, 1 - ((px - x) / r) ** 2));
    const py = y + r * 0.34 * curve + Math.sin(t * Math.PI * 8) * r * 0.04;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ellipse(ctx, x, y, r, ry, PALETTE.cream);
  ellipse(ctx, x, y + ry * 0.04, r * 0.9, ry * 0.82, '#173f3d');
  drawBowlContents(ctx, x, y + ry * 0.06, r * 0.88, ry * 0.78, items);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.97, ry * 0.95, 0, Math.PI * 1.1, Math.PI * 1.45);
  ctx.stroke();
}

/** The food inside a bowl's mouth (an ellipse rx by ry), bottom layer first. */
function drawBowlContents(ctx, x, y, rx, ry, items) {
  const has = (kind) => items.includes(kind);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  if (has('broth')) {
    const broth = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.3, rx * 0.1, x, y, rx);
    broth.addColorStop(0, '#f6c66a');
    broth.addColorStop(1, '#b8722c');
    ellipse(ctx, x, y, rx, ry, broth);
    for (let i = 0; i < 9; i += 1) {
      const a = i * 2.1;
      ellipse(ctx, x + Math.cos(a) * rx * 0.7, y + Math.sin(a) * ry * 0.6, rx * 0.05, ry * 0.07, 'rgba(255,236,170,0.7)');
    }
  }
  if (has('chili')) {
    ctx.fillStyle = 'rgba(214,48,24,0.85)';
    for (let i = 0; i < 7; i += 1) {
      const a = i * 0.9 + 0.4;
      ellipse(ctx, x + Math.cos(a) * rx * 0.62, y + Math.sin(a) * ry * 0.55, rx * 0.1, ry * 0.12, 'rgba(214,48,24,0.85)');
    }
  }
  if (has('rice')) drawRiceMound(ctx, x, y + ry * 0.05, rx * 1.3);
  if (has('noodles')) drawNoodleNest(ctx, x - rx * 0.05, y + ry * 0.05, rx * 1.15, false);
  if (has('chili') && has('rice')) {
    ctx.strokeStyle = '#d12f1a';
    ctx.lineWidth = rx * 0.06;
    ctx.beginPath();
    ctx.moveTo(x - rx * 0.4, y - ry * 0.1);
    ctx.quadraticCurveTo(x, y - ry * 0.6, x + rx * 0.35, y + ry * 0.1);
    ctx.stroke();
  }
  if (has('pork')) {
    drawPork(ctx, x + rx * 0.45, y - ry * 0.1, rx * 0.55, 'ready', 0.5);
    drawPork(ctx, x + rx * 0.3, y + ry * 0.35, rx * 0.5, 'ready', 0.2);
  }
  if (has('shrimp')) {
    drawShrimp(ctx, x - rx * 0.5, y - ry * 0.05, rx * 0.5, 'ready', -1);
    drawShrimp(ctx, x - rx * 0.28, y + ry * 0.4, rx * 0.45, 'ready', 1);
  }
  if (has('scallion')) scatterScallion(ctx, x, y - ry * 0.05, rx * 0.55, ry * 0.5, 14, rx * 0.06);
  ctx.restore();
}
