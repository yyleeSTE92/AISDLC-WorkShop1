#!/usr/bin/env node
/**
 * scripts/build-bundle.mjs
 *
 * Assembles the Snip release bundle from the three source submodules and
 * commits the result into the bundle/ submodule.
 *
 * Usage (run from the superproject root):
 *   node scripts/build-bundle.mjs          # assemble + local commits only
 *   node scripts/build-bundle.mjs --push   # assemble + commit + push
 *
 * Safe to re-run: each commit step is guarded by a staged-diff check so the
 * script is a no-op when nothing changed.
 */

import { execSync } from 'child_process';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync
} from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const PUSH = process.argv.includes('--push');
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = join(ROOT, 'bundle');
const FE = join(ROOT, 'frontend');

// ── tiny helpers ──────────────────────────────────────────────────────────────

function log(msg) {
  process.stdout.write(msg + '\n');
}
function step(n, msg) {
  log(`\n[${n}] ${msg}`);
}

/** Run a command, streaming its output; throws on non-zero exit. */
function run(cmd, cwd = ROOT) {
  log(`  $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

/**
 * Returns true when the git staging area contains at least one staged change.
 * `git diff --cached --quiet` exits 0 (no diff) or 1 (has diff).
 */
function hasStagedChanges(cwd) {
  try {
    execSync('git diff --cached --quiet', { cwd, stdio: 'ignore' });
    return false; // exit 0 → nothing staged
  } catch {
    return true; // exit 1 → staged changes present
  }
}

/** Silently run a command; returns stdout string. */
function capture(cmd, cwd = ROOT) {
  return execSync(cmd, {
    encoding: 'utf8',
    cwd,
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

// ── Step 1: update source submodules to their remote branch tips ──────────────
step('1/5', 'Updating backend / frontend / cli to branch tips…');
run('git submodule update --init --remote backend frontend cli');

// ── Step 2: build the Angular SPA ─────────────────────────────────────────────
step('2/5', 'Building Angular frontend…');
run('npm install', FE);
run('npx ng build', FE);

const INDEX_HTML = join(FE, 'dist', 'snip-frontend', 'browser', 'index.html');
if (!existsSync(INDEX_HTML)) {
  process.stderr.write(
    `\nFATAL: missing expected build output:\n  ${INDEX_HTML}\n`
  );
  process.exit(1);
}
log('  ✔ frontend/dist/snip-frontend/browser/index.html found');

// ── Step 3: ensure bundle/ is on its branch (submodule update = detached HEAD) ─
step('3/5', 'Preparing bundle/ submodule…');
run('git submodule update --init bundle');
run('git fetch origin', BUNDLE);
try {
  execSync('git checkout bundle', { cwd: BUNDLE, stdio: 'pipe' });
  log('  ✔ bundle/ → branch "bundle"');
} catch {
  execSync('git checkout -B bundle origin/bundle', {
    cwd: BUNDLE,
    stdio: 'pipe'
  });
  log('  ✔ bundle/ → created local branch "bundle" tracking origin/bundle');
}

// ── Step 4: assemble bundle/ ──────────────────────────────────────────────────
step('4/5', 'Assembling bundle/…');

// server.js — the Bun HTTP server
copyFileSync(join(ROOT, 'backend', 'server.js'), join(BUNDLE, 'server.js'));
log('  ✔ server.js');

// cli.js — the Node CLI
copyFileSync(join(ROOT, 'cli', 'cli.js'), join(BUNDLE, 'cli.js'));
log('  ✔ cli.js');

// public/ — Angular SPA build output
const PUBLIC = join(BUNDLE, 'public');
if (existsSync(PUBLIC)) rmSync(PUBLIC, { recursive: true, force: true });
cpSync(join(FE, 'dist', 'snip-frontend', 'browser'), PUBLIC, {
  recursive: true
});
log('  ✔ public/  (Angular SPA)');

// .env — Bun auto-loads this; points server.js at the SPA
writeFileSync(join(BUNDLE, '.env'), 'PUBLIC_DIR=./public\n');
log('  ✔ .env');

// package.json — NO "type" field so cli.js runs under plain node
writeFileSync(
  join(BUNDLE, 'package.json'),
  JSON.stringify(
    {
      name: 'snip-bundle',
      version: '1.0.0',
      description: 'Snip – assembled release (backend + frontend + CLI)',
      scripts: { start: 'bun server.js' }
    },
    null,
    2
  ) + '\n'
);
log('  ✔ package.json');

// Dockerfile
writeFileSync(
  join(BUNDLE, 'Dockerfile'),
  [
    'FROM oven/bun:1-alpine',
    'WORKDIR /app',
    'COPY . .',
    'ENV PORT=3000',
    'EXPOSE 3000',
    'CMD bun server.js',
    ''
  ].join('\n')
);
log('  ✔ Dockerfile');

// .dockerignore
writeFileSync(
  join(BUNDLE, '.dockerignore'),
  ['node_modules', '.git', '*.log', ''].join('\n')
);
log('  ✔ .dockerignore');

// railway.json — Railway: build with the Dockerfile
writeFileSync(
  join(BUNDLE, 'railway.json'),
  JSON.stringify({ build: { builder: 'DOCKERFILE' } }, null, 2) + '\n'
);
log('  ✔ railway.json');

// ── Step 5: commit inside bundle/ and bump the superproject ───────────────────
step('5/5', 'Committing…');

// 5a. commit inside bundle/
run('git add -A', BUNDLE);
if (hasStagedChanges(BUNDLE)) {
  run('git commit -m "chore: rebuild bundle [ci skip]"', BUNDLE);
  log('  ✔ bundle/ committed');
} else {
  log('  ℹ bundle/: nothing to commit');
}

// 5b. bump submodule pointers in the superproject
run('git add backend frontend cli bundle');
if (hasStagedChanges(ROOT)) {
  run('git commit -m "chore: bump submodule pointers"');
  log('  ✔ superproject committed');
} else {
  log('  ℹ superproject: nothing to commit');
}

// ── Push (opt-in: --push) ─────────────────────────────────────────────────────
if (PUSH) {
  log('\n[push] Pushing bundle branch…');
  // HEAD:bundle works whether bundle/ is on an attached or detached HEAD
  run('git push origin HEAD:bundle', BUNDLE);
  log('[push] Pushing superproject main…');
  run('git push origin main');
  log('  ✔ pushed');
} else {
  log('\n  (dry-run — pass --push to publish to origin)');
}

log('\n✅  build-bundle done.\n');
