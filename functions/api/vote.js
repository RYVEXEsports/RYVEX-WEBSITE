import { memberPost } from '../_lib/memberBridge.js';
export async function onRequestPost({ request, env }) { return memberPost(request, env, '/api/v1/vote'); }
