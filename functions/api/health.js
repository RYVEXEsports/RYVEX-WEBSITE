import {WEBSITE_VERSION} from '../_lib/version.js';
export async function onRequestGet({env}){
  const base=String((env.RYVEX_CORE_API_URL||env.RYVEX_BOT_API_URL)||'').replace(/\/$/,'');
  const key=String((env.RYVEX_WEBSITE_API_KEY||env.RYVEX_BOT_API_KEY)||'');
  let manager={reachable:false,status:null,version:null,realtime:null};
  if(/^https:\/\//i.test(base)&&key){
    try{
      const r=await fetch(base+'/api/v1/platform-heartbeat',{headers:{'Accept':'application/json','X-RYVEX-API-KEY':key,'X-RYVEX-PLATFORM':'website','X-RYVEX-PLATFORM-VERSION':WEBSITE_VERSION},cf:{cacheEverything:false}});
      const j=await r.json().catch(()=>null);manager={reachable:Boolean(r.ok&&j?.ok),status:r.status,version:j?.version||null,realtime:j?.realtime||null};
    }catch{}
  }
  return Response.json({ok:true,service:'RYVEX Website',version:WEBSITE_VERSION,manager},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
