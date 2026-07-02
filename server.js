// Snip – tiny URL shortener (Bun, zero npm deps)

const PORT = parseInt(process.env.PORT) || 3000;
const BASE_URL =
  process.env.BASE_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${PORT}`);
const PUBLIC_DIR = process.env.PUBLIC_DIR || null;

// ── in-memory store ──────────────────────────────────────────────────────────
const links = new Map(); // code -> { code, url, shortUrl, hits, createdAt }

// ── helpers ──────────────────────────────────────────────────────────────────
const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generateCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += BASE62[Math.floor(Math.random() * BASE62.length)];
  }
  return code;
}

function isValidUrl(str) {
  try {
    const { protocol } = new URL(str);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

// ── CORS ─────────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}

// ── static file helper ───────────────────────────────────────────────────────
async function tryStatic(pathname) {
  if (!PUBLIC_DIR) return null;
  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const file = Bun.file(`${PUBLIC_DIR}/${rel}`);
  return (await file.exists()) ? new Response(file, { headers: CORS }) : null;
}

// ── server ───────────────────────────────────────────────────────────────────
Bun.serve({
  port: PORT,

  async fetch(req) {
    const { pathname } = new URL(req.url);
    const method = req.method.toUpperCase();

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── POST /api/links ──────────────────────────────────────────────────────
    if (method === 'POST' && pathname === '/api/links') {
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: 'Invalid JSON' }, 400);
      }

      if (!body?.url || !isValidUrl(body.url)) {
        return json({ error: 'url must be a valid http(s) address' }, 400);
      }

      // guarantee uniqueness
      let code;
      do {
        code = generateCode();
      } while (links.has(code));

      const link = {
        code,
        url: body.url,
        shortUrl: `${BASE_URL}/${code}`,
        hits: 0,
        createdAt: new Date().toISOString()
      };
      links.set(code, link);
      return json(link, 201);
    }

    // ── GET /api/links ───────────────────────────────────────────────────────
    if (method === 'GET' && pathname === '/api/links') {
      return json([...links.values()]);
    }

    // ── GET (static files first, then short-code redirect) ───────────────────
    if (method === 'GET') {
      // existing file wins over same-named short code
      const staticRes = await tryStatic(pathname);
      if (staticRes) return staticRes;

      // short-code redirect (single-segment paths only)
      if (pathname !== '/') {
        const code = pathname.slice(1);
        if (!code.includes('/')) {
          const link = links.get(code);
          if (link) {
            link.hits++;
            return new Response(null, {
              status: 302,
              headers: { ...CORS, Location: link.url }
            });
          }
        }
      }

      return json({ error: 'Not found' }, 404);
    }

    return json({ error: 'Method not allowed' }, 405);
  }
});

console.log(`Snip listening on :${PORT}  (BASE_URL=${BASE_URL})`);
