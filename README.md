# snip-bundle

> **This branch contains generated output. Do not edit by hand.**
>
> All content is produced by `scripts/build-bundle.mjs` in the superproject.
> Run the script to rebuild:
>
> ```bash
> node scripts/build-bundle.mjs        # assemble + local commit
> node scripts/build-bundle.mjs --push # assemble + commit + push
> ```

## Contents (after first build)

| File / Dir | Source |
|------------|--------|
| `server.js` | `backend/server.js` |
| `cli.js` | `cli/cli.js` |
| `public/` | `frontend/dist/snip-frontend/browser/` |
| `.env` | generated (`PUBLIC_DIR=./public`) |
| `package.json` | generated (no `"type"` field) |
| `Dockerfile` | generated (`FROM oven/bun:1-alpine`) |
| `.dockerignore` | generated |
| `railway.json` | generated (Dockerfile builder) |
