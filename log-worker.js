// cDa visit log — paste into Cloudflare dashboard → Workers → Create.
// NOT in front of deathaxolotl.org. workers.dev only.
// Settings → Variables → CDA_ADMIN = (the passphrase, never commit it)

const KEY = "https://cda.invalid/visits";

function ipOf(req) {
  return (
    req.headers.get("CF-Connecting-IP") ||
    (req.headers.get("X-Forwarded-For") || "").split(",")[0].trim() ||
    req.headers.get("X-Real-IP") ||
    "unknown"
  );
}

function cors(extra) {
  return {
    "Access-Control-Allow-Origin": "https://deathaxolotl.org",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "no-store",
    ...(extra || {})
  };
}

async function load(cache) {
  const hit = await cache.match(KEY);
  if (!hit) return [];
  try {
    const data = await hit.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

async function save(cache, list) {
  await cache.put(
    KEY,
    new Response(JSON.stringify(list), {
      headers: { "Content-Type": "application/json", "Cache-Control": "max-age=31536000" }
    })
  );
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cache = caches.default;

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors() });
    }

    if (url.pathname === "/t") {
      const rec = {
        t: new Date().toISOString(),
        ip: ipOf(req),
        path: url.searchParams.get("p") || "/",
        ua: (req.headers.get("User-Agent") || "").slice(0, 240)
      };
      let list = await load(cache);
      list.unshift(rec);
      if (list.length > 2000) list = list.slice(0, 2000);
      await save(cache, list);
      return new Response(null, {
        status: 204,
        headers: { ...cors(), "Access-Control-Allow-Origin": "*" }
      });
    }

    if (url.pathname === "/v") {
      const auth = req.headers.get("Authorization") || "";
      const token = auth.replace(/^Bearer\s+/i, "");
      if (!env.CDA_ADMIN || token !== env.CDA_ADMIN) {
        return new Response("denied", { status: 401, headers: cors() });
      }
      const list = await load(cache);
      return new Response(JSON.stringify(list), {
        headers: { ...cors(), "Content-Type": "application/json" }
      });
    }

    return new Response("cDa log", { status: 404, headers: cors() });
  }
};
