import { requireMember, bridgeFetch, json } from '../_lib/memberBridge.js';
export async function onRequestGet({ request, env }) {
  const gate = await requireMember(request, env); if (!gate.ok) return gate.response;
  const url = new URL(request.url);
  const channelId = String(url.searchParams.get('channelId') || '');
  const limit = Math.min(75, Math.max(10, Number(url.searchParams.get('limit')) || 50));
  if (!/^\d{15,25}$/.test(channelId)) return json({ ok:false, error:'invalid_channel' }, 400);
  const out = await bridgeFetch(env, gate.session.sub, `/api/v1/chat/messages?channelId=${encodeURIComponent(channelId)}&limit=${limit}`);
  return json(out.body, out.status);
}
