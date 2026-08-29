import {WEBSITE_VERSION} from './version.js';
import { parseCookies, verifySession } from './session.js';
import { checkManagerClubAccess } from './access.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
};

export function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

export async function requireMember(request, env) {
  const cookies = parseCookies(request);
  const session = await verifySession(cookies.ryvex_session, String(env.RYVEX_WEBSITE_SESSION_SECRET || ''));
  if (!session) return { ok: false, response: json({ ok: false, error: 'unauthorized' }, 401) };
  if (session.accessType === 'visitor') return { ok: false, response: json({ ok: false, error: 'club_member_required' }, 403) };
  if (String(session.guild) !== String(env.RYVEX_GUILD_ID || '')) {
    return { ok: false, response: json({ ok: false, error: 'wrong_guild' }, 403) };
  }
  const access = await checkManagerClubAccess(env, session.sub);
  if (!access.active) {
    return { ok: false, response: json({ ok: false, error: 'membership_inactive', reason: access.reason }, 403) };
  }
  return { ok: true, session, access };
}


export function memberHasPermission(gate, permission) {
  const permissions = gate?.access?.permissions || {};
  return permissions.isOwner === true || permissions?.[permission] === true;
}
export function memberIsOwner(gate) {
  return gate?.access?.permissions?.isOwner === true || gate?.access?.level === 'owner';
}
export function permissionDenied(permission, gate) {
  return json({ ok:false, error:permission === 'owner' ? 'owner_required' : 'permission_required', permission, access:gate?.access?.level || null }, 403);
}

function bridgeConfig(env) {
  const base = String((env.RYVEX_CORE_API_URL||env.RYVEX_BOT_API_URL) || '').replace(/\/$/, '');
  const key = String((env.RYVEX_WEBSITE_API_KEY||env.RYVEX_BOT_API_KEY) || '');
  return { base, key, configured: /^https:\/\//i.test(base) && !!key };
}

export async function bridgeFetch(env, userId, path, init = {}) {
  const { base, key, configured } = bridgeConfig(env);
  if (!configured) return { ok: false, status: 503, body: { ok: false, error: 'live_bridge_not_configured' } };
  if (!/^\d{15,25}$/.test(String(userId || ''))) return { ok: false, status: 400, body: { ok: false, error: 'missing_user' } };

  try {
    const headers = new Headers(init.headers || {});
    headers.set('Accept', 'application/json');
    headers.set('X-RYVEX-API-KEY', key);
    headers.set('X-RYVEX-PLATFORM', 'website');
    headers.set('X-RYVEX-PLATFORM-VERSION', WEBSITE_VERSION);
    headers.set('X-RYVEX-USER-ID', String(userId));
    if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${base}${path}`, { ...init, headers });
    const text = await response.text();
    let body = null;
    try { body = JSON.parse(text); } catch { body = { ok: false, error: 'invalid_bridge_response' }; }
    return { ok: response.ok && body?.ok !== false, status: response.status, body };
  } catch {
    return { ok: false, status: 502, body: { ok: false, error: 'bridge_unreachable' } };
  }
}

export async function memberGet(request, env, path) {
  const gate = await requireMember(request, env);
  if (!gate.ok) return gate.response;
  const out = await bridgeFetch(env, gate.session.sub, path);
  return json(out.body, out.status);
}

export async function memberPost(request, env, path) {
  const gate = await requireMember(request, env);
  if (!gate.ok) return gate.response;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return json({ ok: false, error: 'invalid_json' }, 400);
  const out = await bridgeFetch(env, gate.session.sub, path, { method: 'POST', body: JSON.stringify(body) });
  return json(out.body, out.status);
}
