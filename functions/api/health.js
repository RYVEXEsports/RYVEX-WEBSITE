export async function onRequestGet({env}){
  const base=String(env.RYVEX_BOT_API_URL||'').replace(/\/$/,'');
  const key=String(env.RYVEX_BOT_API_KEY||'');
  let manager={reachable:false,status:null,version:null,realtime:null};
  if(/^https:\/\//i.test(base)&&key){
    try{
      const r=await fetch(base+'/api/v1/platform-heartbeat',{headers:{'Accept':'application/json','X-RYVEX-API-KEY':key,'X-RYVEX-PLATFORM':'website','X-RYVEX-PLATFORM-VERSION':'2.4.0'},cf:{cacheEverything:false}});
      const j=await r.json().catch(()=>null);manager={reachable:Boolean(r.ok&&j?.ok),status:r.status,version:j?.version||null,realtime:j?.realtime||null};
    }catch{}
  }
  return Response.json({ok:true,service:'RYVEX Website',version:'2.4.0',manager},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
