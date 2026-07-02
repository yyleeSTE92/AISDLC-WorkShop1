# CLAUDE.md — Snip repo conventions

# Mirror: .github/copilot-instructions.md — keep both files in sync when editing either one.

## What this repo is

**Snip** is a tiny URL shortener built as a _superproject_ (`main` branch) that wires
four orphan branches together as Git submodules. Every branch is independently
deployable and has no shared history with the others.

## Layout & tech stack

| Path        | Branch     | Tech                                       | Role                                                    |
| ----------- | ---------- | ------------------------------------------ | ------------------------------------------------------- |
| `backend/`  | `backend`  | Bun, zero npm deps                         | HTTP server, in-memory store                            |
| `frontend/` | `frontend` | Angular 19, standalone components, signals | SPA                                                     |
| `cli/`      | `cli`      | Node.js CommonJS, zero npm deps            | Terminal client                                         |
| `bundle/`   | `bundle`   | —                                          | **GENERATED** — assembled by `scripts/build-bundle.mjs` |
| `scripts/`  | `main`     | Node ESM                                   | Build tooling (superproject only)                       |
| `.github/`  | `main`     | GitHub Actions                             | CI/CD (superproject only)                               |

## API contract

Change it in **all three clients simultaneously or not at all.**

| Method | Path         | Body                  | Success               | Error               |
| ------ | ------------ | --------------------- | --------------------- | ------------------- |
| `POST` | `/api/links` | `{"url":"https://…"}` | `201` link object     | `400 {"error":"…"}` |
| `GET`  | `/api/links` | —                     | `200` array           | —                   |
| `GET`  | `/:code`     | —                     | `302 Location: <url>` | `404 {"error":"…"}` |

Link object: `{ code, url, shortUrl, hits, createdAt }` — hits start at 0, createdAt is ISO 8601.

## Key commands

```bash
# Run backend
cd backend && bun server.js

# Run frontend dev server
cd frontend && npm install && npx ng serve

# Run CLI
cd cli && node cli.js help

# Assemble bundle (local commit, no push)
node scripts/build-bundle.mjs

# Assemble bundle + push bundle branch + bump main pointer
node scripts/build-bundle.mjs --push
```

Submodule clone: `git clone -b main --recurse-submodules <repo-url>`
Update a submodule after editing it:

```bash
git submodule update --remote <path>
git add <path>
git commit -m "chore: bump <path> submodule"
```

## DO / DON'T

### bundle/ is generated — never hand-edit

`bundle/` is the output of `scripts/build-bundle.mjs`. Its contents (`server.js`,
`cli.js`, `public/`, `.env`, `package.json`, `Dockerfile`, `.dockerignore`,
`railway.json`) are overwritten on every run. Edit the source branches instead.

### cli.js must stay CommonJS — never add `"type":"module"`

`cli.js` is required by downstream tools in a CommonJS context. Adding
`"type":"module"` to `cli/package.json` (or `bundle/package.json`) breaks `require()`
and the `snip.cmd` / `snip.ps1` wrappers.

### The Angular build output path is load-bearing

`scripts/build-bundle.mjs` hard-codes `frontend/dist/snip-frontend/browser/`.
If you rename the Angular project, change the outputPath in `angular.json`, or use SSR
mode, update the path in the script too.

### Storage is in-memory by design

`backend/server.js` uses a `Map`. All data is lost on restart. This is intentional
for the workshop scope — do not add file/DB persistence without updating all three
clients and the API contract table above.

### bundle CI is schedule-only — no push trigger

`.github/workflows/bundle.yml` runs on `schedule` (hourly) + `workflow_dispatch`
only. A `push` trigger would never fire because GitHub evaluates workflow files from
the pushed branch, and this file only exists on `main` — not on `backend`,
`frontend`, or `cli`.

### docker CI's path filter watches the bundle GITLINK, not files inside bundle/

`.github/workflows/docker.yml` has `paths: [bundle]`. The `bundle` entry in the
superproject is a **gitlink** (mode 160000) — a single SHA pointer, not a directory.
The docker workflow fires when that pointer changes (a new bundle release was pinned),
not when files inside `bundle/` change in isolation.
