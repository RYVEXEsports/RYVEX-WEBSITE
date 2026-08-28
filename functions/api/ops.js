import { requireMember, bridgeFetch, memberHasPermission, memberIsOwner, permissionDenied, json } from '../_lib/memberBridge.js';

const RULES = [
  [/^voting\.cleanup\./, 'owner'],
  [/^voting\./, 'canManagePolls'],
  [/^automation\./, 'canManagePolls'],
  [/^lineup\./, 'canManageLineups'],
  [/^match\./, 'canManageMatches'],
  [/^ea\.sync$/, 'canRunEaSync'],
  [/^player_watch\.refresh$/, 'canViewPlayerWatch'],
  [/^(system\.(refresh_centers|repair|integrity)|access\.reconcile)$/, 'canManageSystem']
];
function requiredPermission(action){for(const [rx,perm] of RULES)if(rx.test(action))return perm;return null;}
export async function onRequestPost({ request, env }) {
  const gate=await requireMember(request,env); if(!gate.ok)return gate.response;
  const body=await request.json().catch(()=>null); if(!body||typeof body!=='object')return json({ok:false,error:'invalid_json'},400);
  const action=String(body.action||'').trim(), permission=requiredPermission(action); if(!permission)return json({ok:false,error:'unsupported_action',action},400);
  if(permission==='owner' ? !memberIsOwner(gate) : !memberHasPermission(gate,permission)) return permissionDenied(permission,gate);
  const out=await bridgeFetch(env,gate.session.sub,'/api/v1/ops',{method:'POST',body:JSON.stringify(body)}); return json(out.body,out.status);
}
