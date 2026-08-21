import { requireIdentity, forwardPublicRequest, publicJson, sanitizeMerch } from '../_lib/publicRequest.js';

export async function onRequestPost({ request, env }) {
  const gate = await requireIdentity(request, env);
  if (!gate.ok) return gate.response;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return publicJson({ ok: false, error: 'invalid_json' }, 400);
  const data = sanitizeMerch(body);
  if (!data.item) return publicJson({ ok: false, error: 'missing_item' }, 400);
  const result = await forwardPublicRequest(env, gate.session, 'merch', data);
  return publicJson(result.ok ? { ok: true, via: result.via } : { ok: false, error: result.error }, result.ok ? 200 : (result.status || 503));
}
