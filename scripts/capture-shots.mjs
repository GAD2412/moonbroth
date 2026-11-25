// Takes the entry's screenshots from the real game: serves game/, opens each ?shot= scene in
// Chrome at 1280 x 720, waits for the scene to stage itself, and saves the frame as a JPEG
// (straight from Chrome, never edited) under screenshots/. Run: node scripts/capture-shots.mjs
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openChrome } from './chrome.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const MAX_BYTES = 256 * 1024;
const SHOTS = [
  { name: '01-lantern-rush.jpg', query: '?shot=cover&seed=15' },
  { name: '02-title.jpg', query: '?shot=title&seed=12' },
  { name: '03-first-shift-tutorial.jpg', query: '?shot=tutorial&seed=12' },
  { name: '04-festival-night.jpg', query: '?shot=festival&seed=18' },
];

const server = spawn(process.execPath, [join(root, 'serve.ts')], { stdio: 'ignore' });
await new Promise((resolve) => setTimeout(resolve, 600));
const page = await openChrome();
const folder = join(root, 'screenshots');
mkdirSync(folder, { recursive: true });
for (const file of readdirSync(folder)) rmSync(join(folder, file));
try {
  for (const shot of SHOTS) {
    await page.goto(`http://localhost:8080/${shot.query}`);
    await page.waitFor("document.body.dataset.shotReady === 'yes'");
    let quality = 90;
    let data;
    do {
      ({ data } = await page.send('Page.captureScreenshot', { format: 'jpeg', quality, clip: { x: 0, y: 0, width: 1280, height: 720, scale: 1 } }));
      quality -= 5;
    } while (Buffer.from(data, 'base64').length > MAX_BYTES && quality > 40);
    const bytes = Buffer.from(data, 'base64');
    writeFileSync(join(folder, shot.name), bytes);
    console.log(`${shot.name}  ${(bytes.length / 1024).toFixed(0)} KiB  quality ${quality + 5}`);
  }
  if (page.errors.length) console.log('console errors:', page.errors);
  else console.log('no console errors');
} finally {
  await page.close();
  server.kill();
}
