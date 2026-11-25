// Mouse and keyboard: turns clicks into kitchen targets (in the 1280 x 720 logical screen,
// whatever the window size) and keys into the same targets or into commands.
import { SCREEN } from './config.js';
import { clickTargets } from './kitchen.js';

/** Keys that use a place in the kitchen, as `useTarget` names them. */
export const KEY_TARGETS = {
  1: 'crate:noodles', 2: 'crate:scallion', 3: 'crate:pork', 4: 'crate:shrimp', 5: 'crate:chili',
  a: 'pot', s: 'grill', d: 'kettle', g: 'rice', f: 'board',
  z: 'bowl:0', x: 'bowl:1', c: 'bowl:2', b: 'trash', backspace: 'trash', enter: 'window',
};

/** Keys that are commands rather than places. */
const KEY_COMMANDS = {
  ' ': 'chop', p: 'pause', escape: 'back', r: 'restart', m: 'mute',
  arrowup: 'up', arrowdown: 'down', arrowleft: 'up', arrowright: 'down', enter: 'confirm',
};

/** The view transform that letterboxes the logical screen into the canvas. */
export function fitScreen(canvasWidth, canvasHeight) {
  const scale = Math.min(canvasWidth / SCREEN.width, canvasHeight / SCREEN.height);
  return { scale, x: (canvasWidth - SCREEN.width * scale) / 2, y: (canvasHeight - SCREEN.height * scale) / 2 };
}

/** The kitchen target under a logical point, cooker slots before whole stations. */
export function targetAt(x, y) {
  const hit = clickTargets().find(({ rect }) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h);
  return hit ?? null;
}

/**
 * Listen on `canvas` and `window`. `handlers.onTarget(target)` gets kitchen targets,
 * `handlers.onCommand(name)` gets commands, `handlers.onClick(x, y)` every logical click.
 */
export function setupInput(canvas, getView, handlers) {
  const pointer = { x: 640, y: 400, inside: false };
  const toLogical = (event) => {
    const box = canvas.getBoundingClientRect();
    const view = getView();
    const ratio = canvas.width / box.width;
    return { x: ((event.clientX - box.left) * ratio - view.x) / view.scale, y: ((event.clientY - box.top) * ratio - view.y) / view.scale };
  };
  canvas.addEventListener('pointermove', (event) => {
    const at = toLogical(event);
    pointer.x = at.x;
    pointer.y = at.y;
    pointer.inside = true;
  });
  canvas.addEventListener('pointerleave', () => {
    pointer.inside = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const at = toLogical(event);
    pointer.x = at.x;
    pointer.y = at.y;
    handlers.onGesture();
    handlers.onClick(at.x, at.y);
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = KEY_TARGETS[key];
    const command = KEY_COMMANDS[key];
    if (!target && !command) return;
    event.preventDefault();
    handlers.onGesture();
    if (event.repeat) return;
    handlers.onKey(target ?? null, command ?? null);
  });
  return pointer;
}
