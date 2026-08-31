import { requireMember, bridgeFetch, json } from '../_lib/memberBridge.js';

export async function onRequestGet({ request, env }) {
  const gate = await requireMember(request, env);
  if (!gate.ok) return gate.response;
  try {
    const out = await bridgeFetch(env, gate.session.sub, '/api/v1/state');
    if (out.status >= 400 || !out.body?.ok) {
      return json({ ok:false, error:out.body?.error||`core_${out.status}`, online:false, live:false }, out.status || 502);
    }
    const stream = out.body.stream || {};
    const live = Boolean(stream.live);
    return json({
      ok:true,
      online:live,
      live,
      provider:stream.provider||'youtube',
      channelId:stream.channelId||null,
      videoId:stream.videoId||null,
      url:stream.url||null,
      embedUrl:stream.embedUrl||null,
      title:stream.title||null,
      thumbnail:stream.thumbnail||null,
      concurrentViewers:stream.concurrentViewers||null,
      checkedAt:stream.checkedAt||out.body.generatedAt||null,
      stale:Boolean(stream.stale),
      source:stream.source||'python-core'
    });
  } catch (e) {
    return json({ ok:false, error:'core_unreachable', detail:String(e?.message||e), online:false, live:false }, 502);
  }
}
