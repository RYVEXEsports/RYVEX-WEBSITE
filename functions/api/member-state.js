import { parseCookies, verifySession } from "../_lib/session.js";
import { fetchBotState, sanitizeMemberState } from "../_lib/bridge.js";

const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY" };
function json(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers }); }

export async function onRequestGet({ request, env }) {
  const cookies = parseCookies(request);
  const session = await verifySession(cookies.ryvex_session, String(env.RYVEX_WEBSITE_SESSION_SECRET || ""));
  if (!session) return json({ ok: false, error: "unauthorized" }, 401);
  if (String(session.guild) !== String(env.RYVEX_GUILD_ID || "")) return json({ ok: false, error: "wrong_guild" }, 403);

  const serviceViewer = String(env.RYVEX_PUBLIC_VIEW_USER_ID || session.sub);
  const state = await fetchBotState(env, serviceViewer);
  if (!state.ok) return json({ ok: false, error: state.error, bridgeStatus: state.bridgeStatus }, state.status);
  return json({ ...sanitizeMemberState(state.body), viewer: { id: session.sub, name: session.globalName || session.username, avatar: session.avatar || null } });
}
