import { requireMember, json } from '../_lib/memberBridge.js';

export async function onRequestGet({ request, env }) {
  const gate = await requireMember(request, env);
  if (!gate.ok) return gate.response;
  const base = String(env.RYVEX_BOT_API_URL || '').replace(/\/$/, '');
  const key = String((env.RYVEX_WEBSITE_API_KEY||env.RYVEX_BOT_API_KEY) || '');
  if (!/^https:\/\//i.test(base) || !key) return json({ ok:false, error:'live_bridge_not_configured' }, 503);
  try {
    const headers={ 'Accept':'text/event-stream', 'X-RYVEX-API-KEY':key, 'X-RYVEX-PLATFORM':'website', 'X-RYVEX-PLATFORM-VERSION':'2.5.0', 'X-RYVEX-USER-ID':String(gate.session.sub) };
    const lastEventId=request.headers.get('Last-Event-ID')||''; if(/^\d+$/.test(lastEventId))headers['Last-Event-ID']=lastEventId;
    const upstream = await fetch(`${base}/api/v1/stream`, { headers, cf:{cacheEverything:false} });
    if (!upstream.ok || !upstream.body) { const body = await upstream.json().catch(() => ({ ok:false, error:'stream_unavailable' })); return json(body, upstream.status || 502); }
    return new Response(upstream.body, { status:200, headers:{ 'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-store, must-revalidate','Connection':'keep-alive','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff','X-RYVEX-Realtime':'manager-sse-replay' } });
  } catch { return json({ ok:false, error:'bridge_unreachable' }, 502); }
}
