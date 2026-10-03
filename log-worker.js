// cDa visit log — KV-backed. workers.dev only.
// Secret: CDA_ADMIN

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

async function load(env) {
  const raw = await env.LOGS.get("visits");
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

async function save(env, list) {
  await env.LOGS.put("visits", JSON.stringify(list));
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

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
      let list = await load(env);
      list.unshift(rec);
      if (list.length > 5000) list = list.slice(0, 5000);
      await save(env, list);
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
      const list = await load(env);
      return new Response(JSON.stringify(list), {
        headers: { ...cors(), "Content-Type": "application/json" }
      });
    }

    return new Response("cDa log", { status: 404, headers: cors() });
  }
};
