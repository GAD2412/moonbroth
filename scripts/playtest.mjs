// Plays Moonbroth in a visible Chrome window at 1280 x 720 the way a player would: opens the
// first shift, cooks the tutorial bowl with the keyboard, uses the mouse, measures the frame
// rate, then pauses, restarts and mutes. Fails loudly on any console error.
// Run: node scripts/playtest.mjs   (add --headless to run without a window)
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openChrome } from './chrome.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const checks = [];

function check(name, ok, detail = '') {
  checks.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

const server = spawn(process.execPath, [join(root, 'serve.ts')], { stdio: 'ignore' });
await sleep(600);
const page = await openChrome({ headed: !process.argv.includes('--headless') });
const state = (expression) => page.evaluate(`(() => { const app = window.moonbroth; const k = app.kitchen; return ${expression}; })()`);
try {
  await page.goto('http://localhost:8080/');
  await page.waitFor('Boolean(window.moonbroth)');
  check('title screen first', (await state('app.screen')) === 'title');
  await page.key('Enter');
  check('Enter opens the shift card', (await state('app.screen')) === 'intro');
  await page.key('Enter');
  check('Enter starts service', (await state('app.screen')) === 'play');
  check('tutorial is on in shift 1', await state('k.tutorial && !k.tutorial.done'));

  await page.key('1');
  await page.key('a');
  check('noodles go in the pot', await state("k.pot.some((item) => item && item.kind === 'noodles')"));
  await page.key('2');
  await page.key('f');
  for (let i = 0; i < 5; i += 1) await page.key(' ', 'Space');
  check('five strokes slice the scallion', await state("k.board && k.board.stage === 'ready'"));
  await page.key('f');
  await page.key('z');
  await page.key('d');
  await page.key('z');
  check('scallion and broth in bowl Z', await state("k.bowls[0].items.join() === 'scallion,broth'"));
  await page.waitFor("window.moonbroth.kitchen.pot.some((item) => item && item.stage === 'ready')", 10000);
  await page.key('a');
  await page.key('z');
  check('bowl Z matches Scallion Moon', await state("k.bowls[0].items.length === 3"));
  await page.key('z');
  await page.key('Enter');
  check('serving pays the ticket', await state('k.served === 1 && k.score > 0'), `score ${await state('k.score')}`);
  check('tutorial finishes and the clock runs', await state('k.tutorial.done'));

  await page.click(16 + 68, 650);
  check('clicking the noodle crate picks noodles', await state("k.hand && k.hand.item.kind === 'noodles'"));
  await page.click(16 + 60, 300);
  check('clicking the pot drops them in', await state('k.hand === null && k.pot.some(Boolean)'));

  const fps = await page.evaluate('new Promise((resolve) => { let frames = 0; const start = performance.now(); const tick = () => { frames += 1; if (performance.now() - start < 3000) requestAnimationFrame(tick); else resolve(frames / ((performance.now() - start) / 1000)); }; requestAnimationFrame(tick); })');
  check('runs near 60 fps', fps > 50, `${fps.toFixed(1)} fps`);
  const elapsed = await state('k.elapsed');
  check('shift clock is running', elapsed > 2, `${elapsed.toFixed(1)} s`);

  await page.key('p');
  check('P pauses', (await state('app.screen')) === 'paused');
  const pausedAt = await state('k.elapsed');
  await sleep(500);
  check('the clock holds while paused', (await state('k.elapsed')) === pausedAt);
  await page.key('r');
  check('R restarts the shift fresh', await state("app.screen === 'play' && k.served === 0 && k.score === 0 && !k.pot.some(Boolean)"));
  await page.key('m');
  check('M mutes', await state('app.audio.muted'));
  await page.key('m');
  await page.evaluate("window.dispatchEvent(new Event('blur'))");
  check('leaving the window pauses service', (await state('app.screen')) === 'paused');
  await page.key('p');
  await page.key('3');
  check('pork is locked on shift 1', await state('k.hand === null'));
  await page.key('1');
  await page.key('Backspace', 'Backspace');
  check('Backspace bins what you hold', await state('k.hand === null'));
  await page.key('Escape');
  await page.key('Escape');
  check('Esc twice returns to the title', (await state('app.screen')) === 'title');
  check('no console errors', page.errors.length === 0, page.errors.join(' | '));
} finally {
  await page.close();
  server.kill();
}
const failed = checks.filter((entry) => !entry.ok).length;
console.log(failed ? `${failed} check(s) failed` : `all ${checks.length} checks passed`);
process.exit(failed ? 1 : 0);
