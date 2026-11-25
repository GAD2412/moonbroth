// The game's flow from screen to screen (title, shift card, service, pause, tally, finale),
// what each key and click means on each screen, and how a frame is put together.
import { STEP } from './config.js';
import { chopStroke, createKitchen, stepKitchen, useTarget } from './kitchen.js';
import { SHIFTS, starsFor } from './shifts.js';
import { createEffects, drawBanner, drawFloatingTexts, drawParticles, emitAmbient, handleEvent, shakeOffset, stepEffects } from './effects.js';
import { playEvent, resyncMusic, setKitchenSound, stepMusic, toggleMute } from './audio.js';
import { drawKitchen } from './kitchen-art.js';
import { drawHand, drawHud } from './hud.js';
import { drawFinale, drawIntro, drawPause, drawResults, drawTitle, titleShiftRect } from './screens.js';
import { targetAt } from './input.js';

const SAVE_KEY = 'moonbroth-progress-v1';
const LAST_CALL_SECONDS = 2.2;

export function createApp(audio, seed) {
  return { screen: 'title', selected: 0, progress: loadProgress(), kitchen: null, fx: createEffects(), audio, seed, time: 0, lastCall: 0 };
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null');
    if (saved && Array.isArray(saved.stars)) return { unlocked: Math.max(1, Math.min(6, saved.unlocked | 0)), stars: saved.stars };
  } catch {
    // Storage can be blocked (private mode, a sandboxed frame): progress just lasts the visit.
  }
  return { unlocked: 1, stars: [] };
}

function saveProgress(progress) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
  } catch {
    // Same as above: nothing to do when storage is blocked.
  }
}

/** A fresh kitchen for shift `index`, shown behind its opening card. */
export function startShift(app, index) {
  app.selected = index;
  app.kitchen = createKitchen(SHIFTS[index], app.seed + index * 101);
  app.fx = createEffects(app.seed + 3);
  app.lastCall = 0;
  app.screen = 'intro';
}

/** Close the opening card and start service. */
export function openStall(app) {
  app.screen = 'play';
  resyncMusic(app.audio);
}

function finishShift(app) {
  const kitchen = app.kitchen;
  const index = kitchen.shift.number - 1;
  const stars = starsFor(kitchen.shift, kitchen.score);
  app.progress.stars[index] = Math.max(app.progress.stars[index] ?? 0, stars);
  if (stars > 0) app.progress.unlocked = Math.max(app.progress.unlocked, Math.min(6, index + 2));
  saveProgress(app.progress);
  app.screen = 'results';
}

/** Advance the game by one fixed step. */
export function updateApp(app, dt = STEP) {
  app.time += dt;
  const kitchen = app.kitchen;
  if (app.screen === 'play' && kitchen) {
    stepKitchen(kitchen, dt);
    for (const event of kitchen.events) {
      handleEvent(app.fx, event, kitchen);
      playEvent(app.audio, event);
    }
    kitchen.events.length = 0;
    emitAmbient(app.fx, kitchen, dt);
    setKitchenSound(app.audio, kitchen.grill.filter(Boolean).length, Boolean(kitchen.rush));
    if (kitchen.over) {
      app.lastCall += dt;
      if (app.lastCall >= LAST_CALL_SECONDS) finishShift(app);
    }
  } else {
    setKitchenSound(app.audio, 0, false);
  }
  if (kitchen) stepEffects(app.fx, kitchen, dt);
  stepMusic(app.audio, app.screen !== 'paused');
}

function moveSelection(app, delta) {
  app.selected = (app.selected + delta + app.progress.unlocked) % app.progress.unlocked;
}

/** A key on the current screen: `target` is a kitchen place, `command` a named command. */
export function handleKey(app, target, command) {
  if (command === 'mute') {
    toggleMute(app.audio);
    return;
  }
  const screen = app.screen;
  if (screen === 'title') {
    if (command === 'up') moveSelection(app, -1);
    else if (command === 'down') moveSelection(app, 1);
    else if (command === 'confirm') startShift(app, app.selected);
  } else if (screen === 'intro') {
    if (command === 'confirm' || command === 'chop') openStall(app);
    else if (command === 'back') app.screen = 'title';
  } else if (screen === 'play') {
    if (target) useTarget(app.kitchen, target);
    else if (command === 'chop') chopStroke(app.kitchen);
    else if (command === 'pause' || command === 'back') app.screen = 'paused';
    else if (command === 'restart') restartShift(app);
  } else if (screen === 'paused') {
    if (command === 'pause' || command === 'confirm') openStall(app);
    else if (command === 'restart') restartShift(app);
    else if (command === 'back') app.screen = 'title';
  } else if (screen === 'results') {
    if (command === 'confirm') nextFromResults(app);
    else if (command === 'restart') restartShift(app);
    else if (command === 'back') app.screen = 'title';
  } else if (screen === 'finale' && (command === 'confirm' || command === 'back')) {
    app.screen = 'title';
  }
}

/** Pause service when the window loses focus, so a shift never runs on unattended. */
export function pauseIfPlaying(app) {
  if (app.screen === 'play') app.screen = 'paused';
}

function restartShift(app) {
  startShift(app, app.selected);
  openStall(app);
}

function nextFromResults(app) {
  const stars = starsFor(app.kitchen.shift, app.kitchen.score);
  if (stars === 0) restartShift(app);
  else if (app.selected === SHIFTS.length - 1) app.screen = 'finale';
  else startShift(app, app.selected + 1);
}

/** A click at logical (x, y) on the current screen. */
export function handleClick(app, x, y) {
  const screen = app.screen;
  if (screen === 'title') {
    for (let index = 0; index < app.progress.unlocked; index += 1) {
      const rect = titleShiftRect(index);
      if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) startShift(app, index);
    }
  } else if (screen === 'intro') openStall(app);
  else if (screen === 'play') {
    const hit = targetAt(x, y);
    if (hit) useTarget(app.kitchen, hit.target);
  } else if (screen === 'paused') openStall(app);
  else if (screen === 'results') nextFromResults(app);
  else if (screen === 'finale') app.screen = 'title';
}

/** Draw the whole frame for the current screen. */
export function renderApp(ctx, app, pointer) {
  const t = app.time;
  if (app.screen === 'title' || !app.kitchen) {
    drawTitle(ctx, app.progress, app.selected, t, app.audio.muted);
    return;
  }
  if (app.screen === 'finale') {
    drawFinale(ctx, app.progress, t);
    return;
  }
  const kitchen = app.kitchen;
  const shake = shakeOffset(app.fx, t);
  ctx.save();
  ctx.translate(shake.x, shake.y);
  const hover = app.screen === 'play' && pointer.inside ? targetAt(pointer.x, pointer.y) : null;
  drawKitchen(ctx, kitchen, t, hover ? hover.rect : null);
  drawParticles(ctx, app.fx);
  drawHud(ctx, kitchen, t);
  if (app.screen === 'play') drawHand(ctx, kitchen, pointer.x, pointer.y);
  drawFloatingTexts(ctx, app.fx);
  ctx.restore();
  drawBanner(ctx, app.fx);
  if (app.screen === 'intro') drawIntro(ctx, kitchen.shift, t);
  else if (app.screen === 'paused') drawPause(ctx, app.audio.muted);
  else if (app.screen === 'results') drawResults(ctx, kitchen, t, app.selected === SHIFTS.length - 1);
}

/** A line for screen readers saying where the game is. */
export function describeApp(app) {
  if (app.screen === 'title') return `Moonbroth title. Shift ${app.selected + 1} selected. Press Enter to start.`;
  if (!app.kitchen) return '';
  const k = app.kitchen;
  if (app.screen === 'results') return `Shift closed with ${k.score} tips and ${starsFor(k.shift, k.score)} stars.`;
  if (app.screen === 'paused') return 'Paused.';
  return `Shift ${k.shift.number}, ${k.orders.tickets.length} tickets waiting, ${k.score} tips.`;
}
