import { parseCookies, verifySession } from "../_lib/session.js";

const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function onRequestGet({ request, env }) {
  const cookies = parseCookies(request);
  const session = await verifySession(cookies.ryvex_session, String(env.RYVEX_WEBSITE_SESSION_SECRET || ""));
  if (!session) return new Response(JSON.stringify({ ok: true, authenticated: false }), { headers });
  return new Response(JSON.stringify({
    ok: true,
    authenticated: true,
    user: { id: session.sub, name: session.globalName || session.username, avatar: session.avatar || null }
  }), { headers });
}
