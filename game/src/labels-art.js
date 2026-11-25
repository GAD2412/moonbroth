// The small print of the stall: keyboard key caps, station name plates and the pill tags
// that float over bowls ("#12 READY", "ORDER UP").
import { FONT, PALETTE } from './config.js';
import { roundRect } from './food-art.js';

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

/** A station's name plate with its key, at the top-left of `rect`. */
export function stationLabel(ctx, rect, text, key) {
  ctx.font = `bold 12px ${FONT}`;
  const capWidth = key ? Math.max(16, key.length * 7 + 8) : 0;
  const w = ctx.measureText(text).width + (key ? 22 + capWidth : 14);
  roundRect(ctx, rect.x + 6, rect.y + 6, w, 20, 6);
  ctx.fillStyle = 'rgba(21,18,42,0.82)';
  ctx.fill();
  ctx.fillStyle = PALETTE.cream;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, rect.x + 13, rect.y + 16.5);
  if (key) keyCap(ctx, rect.x + w - 2 - capWidth / 2, rect.y + 16, key);
}

/** A pill-shaped tag centred on (x, y); a `ready` tag is green and gently pulses. */
export function bowlTag(ctx, x, y, label, ready, t) {
  const text = ready ? `✓ ${label}` : label;
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
