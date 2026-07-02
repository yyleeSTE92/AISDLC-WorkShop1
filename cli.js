#!/usr/bin/env node
'use strict';

const BASE = (process.env.SNIP_API || 'http://localhost:3000').replace(
  /\/$/,
  ''
);

function die(msg) {
  process.stderr.write(msg + '\n');
  process.exit(1);
}

// ── snip add <url> ────────────────────────────────────────────────────────────
async function add(url) {
  if (!url) die('Usage: snip add <url>');
  let res;
  try {
    res = await fetch(`${BASE}/api/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
  } catch (e) {
    die(`Cannot reach backend: ${e.message}`);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) die(`Error ${res.status}: ${body.error || res.statusText}`);
  console.log(body.shortUrl);
}

// ── snip ls ───────────────────────────────────────────────────────────────────
async function ls() {
  let res;
  try {
    res = await fetch(`${BASE}/api/links`);
  } catch (e) {
    die(`Cannot reach backend: ${e.message}`);
  }
  const data = await res.json().catch(() => []);
  if (!res.ok) die(`Error ${res.status}: ${data.error || res.statusText}`);
  if (data.length === 0) {
    console.log('No links yet.');
    return;
  }

  const cw = Math.max(4, ...data.map(l => l.code.length));
  const hw = Math.max(4, ...data.map(l => String(l.hits).length));
  console.log(`${'CODE'.padEnd(cw)}  ${'HITS'.padStart(hw)}  URL`);
  console.log(`${'─'.repeat(cw)}  ${'─'.repeat(hw)}  ${'─'.repeat(50)}`);
  for (const l of data) {
    console.log(
      `${l.code.padEnd(cw)}  ${String(l.hits).padStart(hw)}  ${l.url}`
    );
  }
}

// ── redirect resolver ─────────────────────────────────────────────────────────
// Uses fetch(redirect:'manual') to stop at the first hop and read the Location
// header.  Falls back to the built-in http/https module for older Node.js
// versions where the opaqueredirect wrapper hides the response headers.
async function resolveRedirect(url) {
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const loc = res.headers.get('location');
    if (loc) return { status: res.status || 302, location: loc };
  } catch {
    /* fall through to http module fallback */
  }

  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? require('https') : require('http');
    mod
      .get(url, r => {
        r.resume(); // drain body so socket is released
        resolve({
          status: r.statusCode,
          location: r.headers['location'] || null
        });
      })
      .on('error', reject);
  });
}

// ── snip open <code> ──────────────────────────────────────────────────────────
async function openCmd(code) {
  if (!code) die('Usage: snip open <code>');
  let info;
  try {
    info = await resolveRedirect(`${BASE}/${code}`);
  } catch (e) {
    die(`Cannot reach backend: ${e.message}`);
  }
  if (info.status === 404 || !info.location) die(`Unknown code: ${code}`);

  const { spawn } = require('child_process');
  if (process.platform === 'win32') {
    // 'start' needs an empty title arg when the URL contains special chars
    spawn('cmd', ['/c', 'start', '', info.location], {
      detached: true,
      stdio: 'ignore'
    }).unref();
  } else {
    const opener = process.platform === 'darwin' ? 'open' : 'xdg-open';
    spawn(opener, [info.location], { detached: true, stdio: 'ignore' }).unref();
  }
  console.log(`Opening: ${info.location}`);
}

// ── usage ─────────────────────────────────────────────────────────────────────
function usage() {
  console.log(
    'Usage:\n' +
      '  snip add <url>    Shorten a URL and print the short link\n' +
      '  snip ls           List all shortened links\n' +
      '  snip open <code>  Open the original URL for a short code in the browser\n' +
      '  snip help         Show this help\n' +
      '\n' +
      'Env:\n' +
      '  SNIP_API  Backend base URL (default: http://localhost:3000)'
  );
}

// ── dispatch ──────────────────────────────────────────────────────────────────
const [, , cmd, arg] = process.argv;

switch (cmd) {
  case 'add':
    add(arg).catch(e => die(e.message));
    break;
  case 'ls':
    ls().catch(e => die(e.message));
    break;
  case 'open':
    openCmd(arg).catch(e => die(e.message));
    break;
  case 'help':
  case '--help':
  case '-h':
  default:
    usage();
}
