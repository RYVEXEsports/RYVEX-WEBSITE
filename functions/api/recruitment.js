import { requireIdentity, forwardPublicRequest, publicJson, sanitizeRecruitment } from '../_lib/publicRequest.js';

export async function onRequestPost({ request, env }) {
  const gate = await requireIdentity(request, env);
  if (!gate.ok) return gate.response;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return publicJson({ ok: false, error: 'invalid_json' }, 400);
  const data = sanitizeRecruitment(body);
  if (!data.primaryPosition || !data.platform || !data.message) return publicJson({ ok: false, error: 'missing_required_fields' }, 400);
  const result = await forwardPublicRequest(env, gate.session, 'recruitment', data);
  return publicJson(result.ok ? { ok: true, via: result.via } : { ok: false, error: result.error }, result.ok ? 200 : (result.status || 503));
}
