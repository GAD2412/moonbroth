// Feedback you can see: steam off the pot and bowls, grill smoke (thick and dark when food
// burns), scallion bits flying off the knife, coins and floating tips on a serve, shakes,
// and the big banners for the rush, the first bowl and last call.
import { FONT, FONT_TITLE, LAYOUT, PALETTE } from './config.js';
import { cookerSlotRect } from './kitchen.js';
import { createRandom } from './random.js';

const MAX_PARTICLES = 420;

export function createEffects(seed = 7) {
  return { particles: [], texts: [], flyers: [], banner: null, shake: 0, flash: 0, random: createRandom(seed), steamClock: 0 };
}

function spawn(fx, particle) {
  if (fx.particles.length < MAX_PARTICLES) fx.particles.push({ age: 0, ...particle });
}

function floatText(fx, value, x, y, color, size = 18, life = 1.1) {
  fx.texts.push({ value, x, y, color, size, life, age: 0 });
}

function burst(fx, x, y, count, colors, speed, kind = 'bit', gravity = 500) {
  const r = fx.random;
  for (let i = 0; i < count; i += 1) {
    const a = r() * Math.PI * 2;
    const v = speed * (0.4 + r() * 0.8);
    spawn(fx, { kind, x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.6, gravity, life: 0.5 + r() * 0.5, size: 3 + r() * 4, color: colors[i % colors.length], spin: r() * 6 });
  }
}

/** Turn one kitchen event into particles, text, shake or a banner. */
export function handleEvent(fx, event, kitchen) {
  const { x, y } = event;
  switch (event.type) {
    case 'chop':
      burst(fx, x, y, 7, ['#5fb53e', '#9fdc6a', '#eef3d8'], 160);
      fx.shake = Math.max(fx.shake, 2.5);
      kitchen.knifeLift = 1;
      break;
    case 'chopDone':
      burst(fx, x, y, 16, ['#5fb53e', '#9fdc6a'], 220);
      floatText(fx, 'SLICED!', x, y - 40, '#b6f08a', 20);
      kitchen.knifeLift = 1;
      break;
    case 'splash':
      burst(fx, x, y - 20, 12, ['#cfe9f0', '#ffffff'], 140, 'drop');
      break;
    case 'sizzle':
      burst(fx, x, y, 10, ['#ffcf6a', '#ff8a3c'], 120, 'spark', 200);
      break;
    case 'plate':
      burst(fx, x, y, event.ready ? 18 : 8, event.ready ? [PALETTE.amberLight, PALETTE.green] : [PALETTE.amberLight], 150, 'spark', 250);
      if (event.ready) floatText(fx, 'BOWL READY!', x, y - 56, PALETTE.green, 18);
      break;
    case 'done':
      floatText(fx, 'DING!', x, y - 6, PALETTE.amberLight, 20, 0.9);
      burst(fx, x, y + 10, 8, [PALETTE.amberLight], 100, 'spark', 100);
      break;
    case 'warn':
      fx.shake = Math.max(fx.shake, 2);
      break;
    case 'burn':
      floatText(fx, event.place === 'pot' ? 'SOGGY!' : 'BURNT!', x, y - 10, '#ff6a50', 24);
      for (let i = 0; i < 14; i += 1) spawn(fx, { kind: 'smoke', x: x + (fx.random() - 0.5) * 40, y, vx: (fx.random() - 0.5) * 30, vy: -40 - fx.random() * 50, gravity: -10, life: 1.6, size: 12 + fx.random() * 12, color: '40,36,40' });
      fx.shake = Math.max(fx.shake, 6);
      break;
    case 'refuse':
      floatText(fx, event.text, x, y, '#ffb0a0', 15, 0.9);
      break;
    case 'serve':
      floatText(fx, `+${event.points}¢`, x, y - 30, PALETTE.amberLight, 30, 1.4);
      if (event.combo >= 2) floatText(fx, `COMBO x${event.combo}`, x, y + 4, '#ffb07a', 18, 1.3);
      if (event.critic) floatText(fx, 'THE CRITIC NODS', x, y + 30, PALETTE.amber, 16, 1.4);
      burst(fx, x, y, 24, [PALETTE.amber, PALETTE.amberLight, '#fff3c9'], 260, 'coin', 600);
      fx.flyers.push({ x0: LAYOUT.rail.x + event.slot * 220 + 104, y0: 165, x1: x - 40, y1: 250, id: event.id, name: event.name, age: 0, life: 1.1 });
      kitchen.bellRing = 1;
      fx.flash = 0.25;
      break;
    case 'missed':
      floatText(fx, `Walked out ${event.text}`, x, y + 30, '#ff7a66', 18, 1.4);
      fx.shake = Math.max(fx.shake, 5);
      break;
    case 'trash':
      burst(fx, x, y, 8, ['#777', '#999'], 120);
      break;
    case 'rushStart':
      fx.banner = { title: 'LANTERN RUSH!', sub: 'Tickets pour in · tips x1.5', color: PALETTE.lantern, age: 0, life: 2.2 };
      break;
    case 'tutorialDone':
      fx.banner = { title: 'THE STALL IS OPEN', sub: 'The clock is running. Keep the rail clear!', color: PALETTE.teal, age: 0, life: 2.4 };
      break;
    case 'shiftOver':
      fx.banner = { title: 'LAST CALL!', sub: 'The lanterns dim on this shift', color: PALETTE.indigoLight, age: 0, life: 2 };
      break;
    default:
      break;
  }
}

/** Steam and smoke that come from the kitchen's state, not from one event. */
export function emitAmbient(fx, kitchen, dt) {
  fx.steamClock += dt;
  if (fx.steamClock < 0.06) return;
  fx.steamClock = 0;
  const r = fx.random;
  const steam = (x, y, size, strength = 0.35) => spawn(fx, { kind: 'steam', x: x + (r() - 0.5) * 20, y, vx: (r() - 0.5) * 12, vy: -30 - r() * 25, gravity: -6, life: 1.4 + r() * 0.6, size, color: '255,255,255', alpha: strength });
  kitchen.pot.forEach((item, slot) => {
    const s = cookerSlotRect('pot', slot);
    if (r() < 0.6) steam(s.x + s.w / 2, LAYOUT.pot.y + 80, 10 + r() * 8, item ? 0.4 : 0.22);
  });
  kitchen.grill.forEach((item, slot) => {
    if (!item) return;
    const s = cookerSlotRect('grill', slot);
    const burning = item.stage === 'ruined' || (item.stage === 'ready' && item.held > 4.5);
    if (r() < (burning ? 0.55 : 0.4)) spawn(fx, { kind: 'smoke', x: s.x + s.w / 2 + (r() - 0.5) * 24, y: LAYOUT.grill.y + 92, vx: (r() - 0.5) * 14, vy: -35 - r() * 25, gravity: -8, life: 1.3, size: burning ? 9 + r() * 6 : 8 + r() * 6, color: burning ? '45,38,42' : '210,200,195', alpha: burning ? 0.32 : 0.25 });
  });
  if (r() < 0.35) steam(LAYOUT.kettle.x + 108, LAYOUT.kettle.y + 40, 8 + r() * 6);
  kitchen.bowls.forEach((bowl, index) => {
    if (bowl && bowl.items.includes('broth') && r() < 0.35) steam(LAYOUT.bowls[index].x + 85, LAYOUT.bowls[index].y + 70, 9 + r() * 6, 0.3);
  });
  kitchen.shelf.forEach((plate, index) => {
    if (r() < 0.5) steam(LAYOUT.window.x + 80 + index * 110, LAYOUT.window.y + 190, 9, 0.4);
  });
}

export function stepEffects(fx, kitchen, dt) {
  for (const p of fx.particles) {
    p.age += dt;
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  fx.particles = fx.particles.filter((p) => p.age < p.life);
  for (const label of fx.texts) label.age += dt;
  fx.texts = fx.texts.filter((label) => label.age < label.life);
  for (const flyer of fx.flyers) flyer.age += dt;
  fx.flyers = fx.flyers.filter((flyer) => flyer.age < flyer.life);
  if (fx.banner) {
    fx.banner.age += dt;
    if (fx.banner.age > fx.banner.life) fx.banner = null;
  }
  fx.shake = Math.max(0, fx.shake - dt * 30);
  fx.flash = Math.max(0, fx.flash - dt);
  kitchen.knifeLift = Math.max(0, (kitchen.knifeLift ?? 0) - dt * 7);
  kitchen.bellRing = Math.max(0, (kitchen.bellRing ?? 0) - dt * 1.5);
}

/** The camera offset for this frame's shake. */
export function shakeOffset(fx, t) {
  return { x: Math.sin(t * 83) * fx.shake, y: Math.cos(t * 71) * fx.shake };
}

export function drawParticles(ctx, fx) {
  for (const p of fx.particles) {
    const life = 1 - p.age / p.life;
    if (p.kind === 'steam' || p.kind === 'smoke') {
      ctx.fillStyle = `rgba(${p.color},${(p.alpha ?? 0.3) * life})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.6 - life * 0.6), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'coin') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(Math.cos(p.age * 12 + p.spin), 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.globalAlpha = life;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin + p.age * 8);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
}

/** A paid ticket stamped PAID, arcing from the rail to the window and shrinking away. */
function drawFlyer(ctx, flyer) {
  const k = flyer.age / flyer.life;
  const ease = 1 - (1 - k) ** 3;
  const x = flyer.x0 + (flyer.x1 - flyer.x0) * ease;
  const y = flyer.y0 + (flyer.y1 - flyer.y0) * ease - Math.sin(k * Math.PI) * 30;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.25 + k * 0.6);
  const s = 1 - k * 0.55;
  ctx.scale(s, s);
  ctx.globalAlpha = Math.min(1, (1 - k) * 3);
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(-70, -34, 140, 68);
  ctx.fillStyle = PALETTE.lantern;
  ctx.fillRect(-70, -34, 140, 18);
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.cream;
  ctx.fillText(`#${flyer.id} ${flyer.name.toUpperCase()}`, 0, -25);
  ctx.rotate(-0.2);
  ctx.strokeStyle = PALETTE.green;
  ctx.lineWidth = 3;
  ctx.strokeRect(-40, -6, 80, 30);
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillStyle = PALETTE.green;
  ctx.fillText('PAID', 0, 10);
  ctx.restore();
}

export function drawFloatingTexts(ctx, fx) {
  for (const flyer of fx.flyers) drawFlyer(ctx, flyer);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const label of fx.texts) {
    const k = label.age / label.life;
    const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.5 : 1.1 - Math.min(0.1, k);
    ctx.font = `bold ${Math.round(label.size * pop)}px ${FONT}`;
    ctx.globalAlpha = Math.min(1, (1 - k) * 2.5);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(13,11,28,0.85)';
    const y = label.y - k * 40;
    ctx.strokeText(label.value, label.x, y);
    ctx.fillStyle = label.color;
    ctx.fillText(label.value, label.x, y);
    ctx.globalAlpha = 1;
  }
}

/** The banner sweeping across the kitchen, and the warm flash on a serve. */
export function drawBanner(ctx, fx) {
  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(255,217,138,${fx.flash * 0.35})`;
    ctx.fillRect(0, 0, 1280, 720);
  }
  const banner = fx.banner;
  if (!banner) return;
  const k = banner.age / banner.life;
  const slide = k < 0.15 ? (1 - k / 0.15) * -1280 : k > 0.85 ? ((k - 0.85) / 0.15) * 1280 : 0;
  ctx.save();
  ctx.translate(slide, 0);
  ctx.fillStyle = 'rgba(13,11,28,0.55)';
  ctx.fillRect(0, 300, 1280, 120);
  ctx.fillStyle = banner.color;
  ctx.fillRect(0, 310, 1280, 100);
  ctx.fillStyle = PALETTE.amber;
  ctx.fillRect(0, 310, 1280, 4);
  ctx.fillRect(0, 406, 1280, 4);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 54px ${FONT_TITLE}`;
  ctx.fillStyle = PALETTE.cream;
  ctx.fillText(banner.title, 640, 350);
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillStyle = PALETTE.amberLight;
  ctx.fillText(banner.sub, 640, 390);
  ctx.restore();
}
