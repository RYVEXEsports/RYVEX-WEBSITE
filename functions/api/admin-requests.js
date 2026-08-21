import { memberGet } from '../_lib/memberBridge.js';
export async function onRequestGet({ request, env }) { return memberGet(request, env, '/api/v1/admin/requests'); }
