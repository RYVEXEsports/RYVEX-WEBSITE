import { parseCookies, verifySession } from "../_lib/session.js";
import { checkManagerClubAccess } from "../_lib/access.js";

const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

export async function onRequestGet({ request, env }) {
  const cookies = parseCookies(request);
  const session = await verifySession(cookies.ryvex_session, String(env.RYVEX_WEBSITE_SESSION_SECRET || ""));
  if (!session) return new Response(JSON.stringify({ ok: true, authenticated: false }), { headers });

  const accessType = session.accessType === 'visitor' ? 'visitor' : 'club';
  let activeMember = false;
  let access = null;
  if (accessType === 'club') {
    access = await checkManagerClubAccess(env, session.sub);
    activeMember = !!access.active;
  }

  return new Response(JSON.stringify({
    ok: true,
    authenticated: true,
    accessType,
    activeMember,
    membershipReason: access?.reason || null,
    user: { id: session.sub, name: session.globalName || session.username, avatar: session.avatar || null }
  }), { headers });
}
