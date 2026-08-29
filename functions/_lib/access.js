import {WEBSITE_VERSION} from './version.js';
function cleanLevel(value) {
  return String(value || '').trim().toLowerCase();
}

function managerConfig(env) {
  const base = String((env.RYVEX_CORE_API_URL||env.RYVEX_BOT_API_URL) || '').replace(/\/$/, '');
  const key = String((env.RYVEX_WEBSITE_API_KEY||env.RYVEX_BOT_API_KEY) || '');
  return { base, key, configured: /^https:\/\//i.test(base) && !!key };
}

function isDeniedLevel(level) {
  return ['guest','visitor','fan','public','none','blocked','banned','removed','inactive','left'].includes(level);
}

function isMemberLevel(level) {
  return ['owner','co-owner','coowner','admin','administrator','club_admin','club-admin','team_admin','team-admin','management','manager','staff','coach','captain','member','player','trial','academy'].includes(level);
}

export function evaluateManagerAccess(body, userId) {
  if (!body || body.ok === false) return { active: false, reason: body?.error || 'manager_denied', permissions: {} };
  const access = body.access || body.viewerAccess || {};
  const membership = body.membership && typeof body.membership === 'object' ? body.membership : {};
  const current = body.currentUser || body.viewer || body.member || {};
  const permissions = body.permissions && typeof body.permissions === 'object' ? body.permissions : {};
  const level = cleanLevel(membership.level || body.accessLevel || access.level || current.access || current.level || current.role);

  const explicit = membership.activeMember ?? membership.active ?? access.activeMember ?? access.active ?? current.activeMember ?? current.active ?? current.isActive;
  if (explicit === false) return { active: false, reason: 'membership_inactive', level, permissions };
  if (access.blocked === true || access.banned === true || current.banned === true) return { active: false, reason: 'membership_blocked', level, permissions };
  if (isDeniedLevel(level)) return { active: false, reason: 'membership_inactive', level, permissions };
  if (permissions.isOwner === true || explicit === true || isMemberLevel(level)) return { active: true, level: level || 'member', permissions, access, current };

  const members = Array.isArray(body.members) ? body.members : [];
  const found = members.find(m => String(m?.id || m?.userId || m?.discordId || '') === String(userId || ''));
  if (found && found.active !== false && found.banned !== true) {
    return { active: true, level: cleanLevel(found.role) || 'member', permissions, access, current: found };
  }

  return { active: false, reason: 'not_active_club_member', level, permissions };
}

async function callManager(env, userId, path) {
  const { base, key, configured } = managerConfig(env);
  if (!configured) return { ok: false, status: 503, error: 'live_bridge_not_configured' };
  if (!/^\d{15,25}$/.test(String(userId || ''))) return { ok: false, status: 400, error: 'missing_user' };
  try {
    const response = await fetch(`${base}${path}`, {
      headers: {
        'Accept': 'application/json',
        'X-RYVEX-API-KEY': key,
        'X-RYVEX-PLATFORM':'website','X-RYVEX-PLATFORM-VERSION':WEBSITE_VERSION,'X-RYVEX-USER-ID': String(userId)
      },
      cf: { cacheEverything: false }
    });
    const body = await response.json().catch(() => null);
    return { ok: response.ok && body?.ok !== false, status: response.status, body, error: body?.error };
  } catch {
    return { ok: false, status: 502, error: 'bridge_unreachable' };
  }
}

export async function checkManagerClubAccess(env, userId) {
  let response = await callManager(env, userId, '/api/v1/access');
  if (response.status === 404 || response.status === 405 || response.status === 501) {
    response = await callManager(env, userId, '/api/v1/state');
  }
  if (!response.ok) {
    return { active: false, reason: response.error || 'manager_access_check_failed', status: response.status };
  }
  return { ...evaluateManagerAccess(response.body, userId), status: response.status };
}
