# Snip – Tiny URL Shortener

One backend, two clients. Each layer lives on its own branch of this repository
and is wired into this superproject as a Git submodule.

```
snip-demo/          ← superproject (main branch, this file)
├── backend/        ← submodule → branch: backend  (Bun server, zero deps)
├── frontend/       ← submodule → branch: frontend (Angular 19 SPA)
├── cli/            ← submodule → branch: cli      (Node.js CLI, zero deps)
├── bundle/         ← submodule → branch: bundle   (GENERATED — do not edit)
└── scripts/
    └── build-bundle.mjs  ← assembles bundle/ from the three source layers
```

---

## Architecture

```
Browser / CLI
      │
      │  HTTP (CORS-open)
      ▼
┌─────────────────────────────┐
│  Bun server  :3000          │
│  POST /api/links            │
│  GET  /api/links            │
│  GET  /:code  → 302         │
│  (optional static serving)  │
└─────────────────────────────┘
        in-memory Map
```

### API contract

| Method | Path         | Body                     | Success                     | Error                    |
| ------ | ------------ | ------------------------ | --------------------------- | ------------------------ |
| `POST` | `/api/links` | `{ "url": "https://…" }` | `201` link object           | `400` `{ "error": "…" }` |
| `GET`  | `/api/links` | —                        | `200` array of link objects | —                        |
| `GET`  | `/:code`     | —                        | `302 Location: <url>`       | `404` `{ "error": "…" }` |

#### Link object shape

```json
{
  "code": "aB3x9Z",
  "url": "https://example.com/long/path",
  "shortUrl": "https://your-domain/aB3x9Z",
  "hits": 0,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Branch / submodule layout

| Branch     | Folder           | Description                          |
| ---------- | ---------------- | ------------------------------------ |
| `backend`  | `backend/`       | Single-file Bun server (`server.js`) |
| `frontend` | `frontend/`      | Angular 19 SPA (`src/app/`)          |
| `cli`      | `cli/`           | Node.js CLI (`cli.js`)               |
| `main`     | _(superproject)_ | This README + `.gitmodules` only     |

Each branch is an **orphan** — no shared history — so you can work on each layer
independently. The superproject records a specific commit SHA for each submodule,
giving you a reproducible snapshot of the whole stack.

---

## Cloning

> **Important:** plain `git clone` leaves the submodule folders empty.
> Always use `--recurse-submodules`:

```bash
git clone --recurse-submodules https://github.com/yyleeSTE92/AISDLC-WorkShop1.git
```

If you already cloned without the flag:

```bash
git submodule update --init --recursive
```

---

## Running all three pieces

### 1 · Backend

```bash
cd backend
bun run server.js          # or: bun start

# env overrides (all optional)
PORT=3000                  # default 3000
BASE_URL=https://sni.p     # origin used in shortUrl values
RAILWAY_PUBLIC_DOMAIN=…    # alternative to BASE_URL on Railway
PUBLIC_DIR=../frontend/dist/snip-frontend/browser   # serve the built SPA
```

### 2 · Frontend (dev)

```bash
cd frontend
npm install
npx ng serve               # http://localhost:4200 → proxies nothing; set
                           # environment.apiUrl = 'http://localhost:3000' if needed
```

Or serve the **production build** via the backend's `PUBLIC_DIR`:

```bash
cd frontend
npm run build              # → dist/snip-frontend/browser/
cd ../backend
PUBLIC_DIR=../frontend/dist/snip-frontend/browser bun start
# visit http://localhost:3000
```

### 3 · CLI

```bash
cd cli
# run ad-hoc
node cli.js help

# or install globally
npm install -g .
snip help

# point at a non-default backend
SNIP_API=https://your-backend.example.com snip ls
```

#### CLI commands

```
snip add <url>    Shorten a URL, print the short link
snip ls           List all shortened links (aligned table)
snip open <code>  Open the destination URL in the OS browser
snip help         Show this help
```

---

## Release bundle (`bundle/` submodule)

The `bundle` branch is **generated output** — never edit it by hand.
It is assembled by `scripts/build-bundle.mjs`, which:

1. Updates backend / frontend / cli submodules to their remote branch tips
2. Builds the Angular SPA (`npm install` + `ng build`)
3. Copies `server.js`, `cli.js`, and the SPA output into `bundle/`
4. Writes `.env` (`PUBLIC_DIR=./public`), `package.json`, `Dockerfile`,
   `.dockerignore`, and `railway.json`
5. Commits inside `bundle/` and bumps the superproject pointer — each step is
   guarded so the script is a **safe no-op** when nothing changed

```bash
# from the superproject root:
node scripts/build-bundle.mjs          # assemble + local commits (dry-run)
node scripts/build-bundle.mjs --push   # assemble + commit + push to origin
```

The assembled bundle can be deployed directly:

```bash
cd bundle
bun start                              # http://localhost:3000 (serves SPA + API)
# or docker build -t snip . && docker run -p 3000:3000 snip
# or push to Railway (railway.json selects the Dockerfile builder)
```

---

## Updating a submodule

1. **Make changes inside the submodule folder** (it is a full repo on its branch):

   ```bash
   cd backend          # or frontend / cli
   # … edit files …
   git add .
   git commit -m "fix: …"
   git push
   ```

2. **Bump the pointer in the superproject**:

   ```bash
   cd ..               # back to superproject root
   git submodule update --remote backend
   git add backend
   git commit -m "chore: bump backend submodule"
   git push
   ```

   `--remote` fetches the tracked branch tip and advances the recorded SHA.
   Without it, `update` just checks out the already-recorded SHA.

---

## Repository

<https://github.com/yyleeSTE92/AISDLC-WorkShop1>
