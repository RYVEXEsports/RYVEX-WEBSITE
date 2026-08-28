import { requireMember, bridgeFetch, memberHasPermission, permissionDenied, json } from '../_lib/memberBridge.js';
const REQUIRED={create_poll:'canManagePolls',close_poll:'canManagePolls',announcement:'canManageAnnouncements'};
export async function onRequestPost({request,env}){
  const gate=await requireMember(request,env);if(!gate.ok)return gate.response;
  const body=await request.json().catch(()=>null);if(!body||typeof body!=='object')return json({ok:false,error:'invalid_json'},400);
  const action=String(body.action||'').trim(),permission=REQUIRED[action];if(!permission)return json({ok:false,error:'unsupported_action',action},400);
  if(!memberHasPermission(gate,permission))return permissionDenied(permission,gate);
  const out=await bridgeFetch(env,gate.session.sub,'/api/v1/manage',{method:'POST',body:JSON.stringify(body)});return json(out.body,out.status);
}
