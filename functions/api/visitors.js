const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin"
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers });
}

function cleanVisitorId(value) {
  const id = String(value || "").trim();
  return /^[A-Za-z0-9-]{16,80}$/.test(id) ? id : "";
}

export async function onRequestGet({ env }) {
  const store = env.RYVEX_VISITORS;
  if (!store || typeof store.get !== "function") {
    return json({ ok: true, configured: false, count: null });
  }

  const current = Number(await store.get("site:unique-visitors")) || 0;
  return json({ ok: true, configured: true, count: current });
}

export async function onRequestPost({ request, env }) {
  const store = env.RYVEX_VISITORS;
  if (!store || typeof store.get !== "function" || typeof store.put !== "function") {
    return json({ ok: true, configured: false, count: null });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const visitorId = cleanVisitorId(body.visitorId);
  if (!visitorId) return json({ ok: false, error: "invalid_visitor_id" }, 400);

  const visitorKey = `site:visitor:${visitorId}`;
  const alreadySeen = await store.get(visitorKey);
  let count = Number(await store.get("site:unique-visitors")) || 0;

  if (!alreadySeen) {
    count += 1;
    // Random anonymous ID only; no IP, Discord ID, email or fingerprint is stored.
    await Promise.all([
      store.put(visitorKey, "1"),
      store.put("site:unique-visitors", String(count))
    ]);
  }

  return json({ ok: true, configured: true, count });
}
