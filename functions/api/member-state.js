import { requireMember, bridgeFetch, json } from '../_lib/memberBridge.js';

export async function onRequestGet({ request, env }) {
  const gate = await requireMember(request, env);
  if (!gate.ok) return gate.response;
  const out = await bridgeFetch(env, gate.session.sub, '/api/v1/state');
  if (!out.ok) return json(out.body, out.status);
  return json({
    ...out.body,
    viewer: {
      id: gate.session.sub,
      name: gate.session.globalName || gate.session.username,
      avatar: gate.session.avatar || null
    }
  });
}
