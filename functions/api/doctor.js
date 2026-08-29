import { requireMember, bridgeFetch, memberHasPermission, permissionDenied, json } from '../_lib/memberBridge.js';
export async function onRequestGet({request,env}){
  const gate=await requireMember(request,env); if(!gate.ok)return gate.response;
  if(!memberHasPermission(gate,'canViewSystemHealth'))return permissionDenied('canViewSystemHealth',gate);
  const out=await bridgeFetch(env,gate.session.sub,'/api/v1/doctor'); return json(out.body,out.status);
}
