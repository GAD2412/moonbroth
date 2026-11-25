// Boots Moonbroth: sizes the canvas to the window, wires input to the game, and runs the
// fixed-step loop. With ?shot=<name> it stages a screenshot scene instead and holds still.
import { SCREEN, STEP } from './config.js';
import { createAudio, unlockAudio } from './audio.js';
import { createApp, describeApp, handleClick, handleKey, renderApp, updateApp } from './game.js';
import { fitScreen, setupInput } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed')) || Math.floor(Math.random() * 1e9);

const audio = createAudio();
const app = createApp(audio, seed);
let view = fitScreen(SCREEN.width, SCREEN.height);

/** Match the canvas to the window (and the screen's pixel density). */
function resizeCanvas() {
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.round(window.innerWidth * ratio);
  const height = Math.round(window.innerHeight * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  view = fitScreen(canvas.width, canvas.height);
}

function drawFrame() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#07060f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, SCREEN.width, SCREEN.height);
  ctx.clip();
  renderApp(ctx, app, pointer);
  ctx.restore();
}

const pointer = setupInput(canvas, () => view, {
  onGesture: () => unlockAudio(audio),
  onClick: (x, y) => handleClick(app, x, y),
  onKey: (target, command) => handleKey(app, target, command),
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let last = performance.now();
let carry = 0;
let spoken = '';

/** One animation frame: catch the simulation up in fixed steps, then draw. */
function frame(now) {
  carry = Math.min(0.25, carry + (now - last) / 1000);
  last = now;
  while (carry >= STEP) {
    updateApp(app, STEP);
    carry -= STEP;
  }
  drawFrame();
  const line = describeApp(app);
  if (line.split(',')[0] !== spoken.split(',')[0]) {
    status.textContent = line;
    spoken = line;
  }
  window.requestAnimationFrame(frame);
}

if (shot) {
  stageShot(shot, app);
  pointer.x = app.shotPointer?.x ?? pointer.x;
  pointer.y = app.shotPointer?.y ?? pointer.y;
  pointer.inside = Boolean(app.shotPointer);
  drawFrame();
  document.body.dataset.shotReady = 'yes';
} else {
  window.requestAnimationFrame(frame);
}

// A handle for play-testing from the browser console (frame timing, the current state).
window.moonbroth = app;
