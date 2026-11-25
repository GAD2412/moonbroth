// A small Chrome DevTools Protocol driver (Node 22, no packages): launch Chrome, open a page
// at 1280 x 720, send protocol commands and collect console errors. Used by the screenshot
// and play-test scripts.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Start Chrome (headless unless `headed`) and return a page session at 1280 x 720. */
export async function openChrome({ headed = false } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'moonbroth-chrome-'));
  const args = [`--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--window-size=1280,720', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required', 'about:blank'];
  if (!headed) args.unshift('--headless=new');
  const chrome = spawn(CHROME, args, { stdio: 'ignore' });
  let pageUrl = null;
  for (let attempt = 0; attempt < 50 && !pageUrl; attempt += 1) {
    await sleep(200);
    try {
      const pages = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      pageUrl = pages.find((page) => page.type === 'page')?.webSocketDebuggerUrl ?? null;
    } catch {
      // Chrome is still starting.
    }
  }
  if (!pageUrl) throw new Error('Chrome did not open a debugging port');
  const socket = new WebSocket(pageUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  const pending = new Map();
  const errors = [];
  let nextId = 1;
  socket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)(data);
      pending.delete(data.id);
    } else if (data.method === 'Runtime.exceptionThrown') {
      errors.push(data.params.exceptionDetails.exception?.description ?? data.params.exceptionDetails.text);
    } else if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
      errors.push(data.params.args.map((arg) => arg.value ?? arg.description).join(' '));
    } else if (data.method === 'Log.entryAdded' && data.params.entry.level === 'error') {
      errors.push(data.params.entry.text);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId;
    nextId += 1;
    pending.set(id, (data) => (data.error ? reject(new Error(`${method}: ${data.error.message}`)) : resolve(data.result)));
    socket.send(JSON.stringify({ id, method, params }));
  });
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  const page = {
    send,
    errors,
    async goto(url) {
      await send('Page.navigate', { url });
      await sleep(400);
    },
    async evaluate(expression) {
      const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      return result.result.value;
    },
    async waitFor(expression, timeout = 20000) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (await page.evaluate(expression)) return true;
        await sleep(100);
      }
      throw new Error(`timed out waiting for ${expression}`);
    },
    async key(key, code = key) {
      const text = key.length === 1 ? key : key === 'Enter' ? '\r' : undefined;
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, text, windowsVirtualKeyCode: key === 'Enter' ? 13 : key === ' ' ? 32 : key.toUpperCase().charCodeAt(0) });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code });
      await sleep(60);
    },
    async click(x, y) {
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
        await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, buttons: type === 'mousePressed' ? 1 : 0 });
      }
      await sleep(60);
    },
    async close() {
      socket.close();
      chrome.kill();
      await sleep(300);
      rmSync(profile, { recursive: true, force: true });
    },
  };
  return page;
}
