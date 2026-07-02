# Snip – Tiny URL Shortener (Backend)

A single-file Bun server with zero npm dependencies.

## Quick start

```bash
bun run server.js
# or
bun start
```

## API

| Method | Path         | Body                     | Response                         |
| ------ | ------------ | ------------------------ | -------------------------------- |
| `POST` | `/api/links` | `{ "url": "https://…" }` | `201` link object                |
| `GET`  | `/api/links` | —                        | `200` array of all links         |
| `GET`  | `/:code`     | —                        | `302` redirect; `404` if unknown |

### Link object shape

```json
{
  "code": "aB3x9Z",
  "url": "https://example.com/some/long/path",
  "shortUrl": "https://your-domain/aB3x9Z",
  "hits": 0,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

Error responses return `{ "error": "…" }` with the appropriate 4xx status.

## Environment variables

| Variable                | Default   | Description                                                                                                         |
| ----------------------- | --------- | ------------------------------------------------------------------------------------------------------------------- |
| `PORT`                  | `3000`    | Port to listen on                                                                                                   |
| `BASE_URL`              | see below | Origin used in `shortUrl` values                                                                                    |
| `RAILWAY_PUBLIC_DOMAIN` | —         | Used to derive `BASE_URL` on Railway                                                                                |
| `PUBLIC_DIR`            | —         | When set, serve static files from this folder; `"/"` → `index.html`; existing files win over same-named short codes |

`BASE_URL` resolution order:

1. `BASE_URL` env var
2. `https://$RAILWAY_PUBLIC_DOMAIN` when `RAILWAY_PUBLIC_DOMAIN` is set
3. `http://localhost:$PORT`

## CORS

All responses include open CORS headers (`Access-Control-Allow-Origin: *`) so a browser app on any origin can call the API directly.
