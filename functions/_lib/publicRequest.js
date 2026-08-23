import { parseCookies, verifySession } from './session.js';

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
};

export function publicJson(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function clean(value, max = 500) {
  return String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max);
}

export async function requireIdentity(request, env) {
  const cookies = parseCookies(request);
  const session = await verifySession(cookies.ryvex_session, String(env.RYVEX_WEBSITE_SESSION_SECRET || ''));
  if (!session?.sub) return { ok: false, response: publicJson({ ok: false, error: 'login_required' }, 401) };
  return { ok: true, session };
}

async function discordWebhook(env, payload) {
  const raw = String(env.RYVEX_PUBLIC_REQUEST_WEBHOOK_URL || '').trim();
  if (!/^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\//i.test(raw)) return null;
  const fields = Object.entries(payload.data || {}).slice(0, 12).map(([name, value]) => ({
    name: clean(name, 60), value: clean(value, 700) || '—', inline: false
  }));
  const response = await fetch(raw, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'RYVEX Website',
      embeds: [{
        title: payload.type === 'recruitment' ? 'Nová žádost o vstup do klubu' : 'Nový zájem o RYVEX merch',
        description: `Discord: ${clean(payload.requester?.name, 80)} (${clean(payload.requester?.id, 30)})`,
        fields,
        timestamp: new Date().toISOString()
      }]
    })
  });
  return response.ok ? { ok: true, via: 'discord_webhook' } : { ok: false, status: response.status };
}

export async function forwardPublicRequest(env, session, type, data) {
  const base = String(env.RYVEX_BOT_API_URL || '').replace(/\/$/, '');
  const key = String(env.RYVEX_BOT_API_KEY || '');
  const payload = {
    type,
    requester: {
      id: String(session.sub),
      name: clean(session.globalName || session.username || 'Discord user', 80),
      avatar: session.avatar || null,
      accessType: session.accessType || 'club'
    },
    data,
    source: 'ryvex-website',
    createdAt: Date.now()
  };

  if (/^https:\/\//i.test(base) && key) {
    try {
      const response = await fetch(`${base}/api/v1/public-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-RYVEX-API-KEY': key,
          'X-RYVEX-PLATFORM': 'website',
          'X-RYVEX-PLATFORM-VERSION': '2.4.0',
          'X-RYVEX-USER-ID': String(session.sub)
        },
        body: JSON.stringify(payload)
      });
      const body = await response.json().catch(() => null);
      if (response.ok && body?.ok !== false) return { ok: true, via: 'manager', body };
      if (![404,405,501].includes(response.status)) return { ok: false, status: response.status, error: body?.error || 'manager_request_failed' };
    } catch {}
  }

  const webhook = await discordWebhook(env, payload);
  if (webhook?.ok) return webhook;
  return { ok: false, status: 503, error: 'public_request_bridge_not_configured' };
}

export function sanitizeRecruitment(input) {
  return {
    primaryPosition: clean(input?.primaryPosition, 24),
    secondaryPosition: clean(input?.secondaryPosition, 24),
    platform: clean(input?.platform, 30),
    availability: clean(input?.availability, 160),
    experience: clean(input?.experience, 900),
    message: clean(input?.message, 1200)
  };
}

export function sanitizeMerch(input) {
  return {
    item: clean(input?.item, 80),
    size: clean(input?.size, 20),
    note: clean(input?.note, 700)
  };
}
