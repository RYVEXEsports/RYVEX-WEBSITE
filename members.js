const $ = id => document.getElementById(id);
const state = { live: null, page: 'overview', chatChannelId: null, supportType: 'help', chatLoaded: false, voiceLoaded: false, adminRequests: [], adminRequestFilter: 'all', adminRequestsLoaded: false, adminRequestsLoading: false };
const POSITION_OPTIONS = ['GK','SO','LO','PO','SOZ','SZ','LSZ','PSZ','OFZ','LZ','PZ','LK','PK','HU'];
const PAGE_LABELS = { overview:'Přehled', vote:'Hlasování', calendar:'Kalendář', lineup:'Sestava', statistics:'Statistiky', activity:'Aktivita', attendance:'Docházka', matches:'Matchday', positions:'Pozice', members:'Hráči', chat:'Chat', voice:'Voice', media:'Radio & Stream', support:'Podpora', management:'Management' };

const PERMISSION_ALIASES = {
  poll: ['canCreatePoll','createPoll','managePolls','polls','canManagePolls'],
  announcement: ['canCreateAnnouncement','createAnnouncement','manageAnnouncements','announcements','canManageAnnouncements'],
  recruitment: ['canManageRecruitment','manageRecruitment','recruitment'],
  sport: ['canManageLineups','canManageMatches','canManageAttendance','canManageStatistics','canManageActivity'],
  management: ['canManageClub','manageClub','canManage','management']
};
function hasPermission(live, capability) {
  const p = live?.permissions || {};
  if (p.isOwner === true) return true;
  if (PERMISSION_ALIASES.management.some(k => p[k] === true)) return true;
  return (PERMISSION_ALIASES[capability] || []).some(k => p[k] === true);
}
function canOpenManagement(live) { return hasPermission(live,'poll') || hasPermission(live,'announcement') || hasPermission(live,'recruitment') || hasPermission(live,'sport'); }

function node(tag, cls = '', text = '') {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = String(text);
  return n;
}
function clear(el) { if (el) el.replaceChildren(); return el; }
function text(v, fallback = '—') { const s = String(v ?? '').trim(); return s || fallback; }
function num(v, fallback = 0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function pct(v) { return Math.max(0, Math.min(100, num(v))); }
function fmt(ts) {
  const n = num(ts, 0); if (!n) return { date:'TBA', time:'—', full:'TBA' };
  const d = new Date(n);
  return {
    date: new Intl.DateTimeFormat('cs-CZ',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d),
    time: new Intl.DateTimeFormat('cs-CZ',{hour:'2-digit',minute:'2-digit'}).format(d),
    full: new Intl.DateTimeFormat('cs-CZ',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d)
  };
}
function safeHttpUrl(value) { try { const u = new URL(String(value || '')); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } }
function avatar(src, name, cls='mini-avatar') {
  const url = safeHttpUrl(src);
  if (url) { const img=node('img',cls); img.src=url; img.alt=''; img.loading='lazy'; img.referrerPolicy='no-referrer'; return img; }
  const d=node('div',cls,text(name,'R').charAt(0).toUpperCase()); return d;
}
function outcomeLabel(v){ return v==='W'?'WIN':v==='L'?'LOSS':v==='D'?'DRAW':text(v,'MATCH'); }
function requestError(data, status) { return data?.error ? `${data.error}${status ? ` (${status})` : ''}` : `HTTP ${status || 500}`; }
async function get(url) {
  const r=await fetch(url,{cache:'no-store',credentials:'same-origin'}); const data=await r.json().catch(()=>({}));
  if(!r.ok || data?.ok===false) throw new Error(requestError(data,r.status)); return data;
}
async function post(url, body) {
  const r=await fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const data=await r.json().catch(()=>({}));
  if(!r.ok || data?.ok===false) throw new Error(requestError(data,r.status)); return data;
}

function closeMobileNav() {
  const menu=$('mobileNavMenu'), trigger=$('mobileNavTrigger'), backdrop=$('mobileNavBackdrop');
  if(menu) menu.hidden=true;
  if(backdrop) backdrop.hidden=true;
  if(trigger) trigger.setAttribute('aria-expanded','false');
  document.documentElement.classList.remove('club-os-menu-open');
}
function toggleMobileNav() {
  const menu=$('mobileNavMenu'), trigger=$('mobileNavTrigger'), backdrop=$('mobileNavBackdrop'); if(!menu||!trigger)return;
  const willOpen=menu.hidden;
  menu.hidden=!willOpen;
  if(backdrop) backdrop.hidden=!willOpen;
  trigger.setAttribute('aria-expanded',willOpen?'true':'false');
  document.documentElement.classList.toggle('club-os-menu-open',willOpen);
}
function showPage(page) {
  const canManage = canOpenManagement(state.live);
  if (page === 'management' && !canManage) page = 'overview';
  state.page = page;
  document.querySelectorAll('.os-page').forEach(p=>p.classList.toggle('active',p.dataset.pagePanel===page));
  document.querySelectorAll('.os-nav').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  document.querySelectorAll('.os-mobile-item').forEach(b=>b.classList.toggle('active',b.dataset.mobilePage===page));
  if($('mobileNavLabel')) $('mobileNavLabel').textContent=PAGE_LABELS[page]||'Club OS';
  closeMobileNav();
  const u=new URL(location.href); if(page==='overview')u.searchParams.delete('page');else u.searchParams.set('page',page); history.replaceState({},'',u);
  if(page==='chat') loadChatChannels().catch(renderChatError);
  if(page==='voice') loadVoice().catch(renderVoiceError);
  if(page==='media') loadYoutube().catch(()=>{});
  if(page==='management' && hasPermission(state.live,'recruitment')) loadAdminRequests(false).catch(()=>{});
  window.scrollTo({top:0,behavior:'smooth'});
}

document.querySelectorAll('.os-nav').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.goto)));
document.querySelectorAll('.os-mobile-item').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.mobilePage)));
$('mobileNavTrigger')?.addEventListener('click',e=>{e.stopPropagation();toggleMobileNav()});
$('mobileNavMenu')?.addEventListener('click',e=>e.stopPropagation());
$('mobileNavBackdrop')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closeMobileNav()});
document.addEventListener('click',()=>closeMobileNav());
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMobileNav()});

function renderIdentity(live) {
  const viewer=live.viewer||{}; const current=live.currentUser||{}; const box=$('memberIdentity'); clear(box);
  const role=text(current.role,'MEMBER').toUpperCase();
  const level=text(live.access?.level || current.access,'member').toUpperCase();
  box.append(avatar(viewer.avatar,viewer.name,'member-avatar'));
  const copy=node('div'); copy.append(node('small','',`${role} • ${level}`),node('strong','',text(viewer.name,'RYVEX member')),node('span','',`${text(current.position,'—')} • Discord verified`)); box.append(copy);
  $('accessLevel').textContent=level;
  if($('topRoleName')) $('topRoleName').textContent=role;
  if($('topRoleAccess')) $('topRoleAccess').textContent=level==='OWNER'?'FULL ACCESS':`${level} ACCESS`;
  if($('topRoleBadge')) $('topRoleBadge').dataset.role=role.toLowerCase().replace(/[^a-z0-9]+/g,'-');
}

function makeListItem(title, meta, badge='LIVE') {
  const row=node('article','member-list-item'), left=node('div'); left.append(node('strong','',title),node('small','',meta)); row.append(left,node('span','',badge)); return row;
}

function renderOverview(live) {
  const s=live.summary||{}; $('mMembers').textContent=String(s.members??'—').padStart(2,'0'); $('mOnline').textContent=String(s.online??'—').padStart(2,'0'); $('mWins').textContent=String(s.wins??'—').padStart(2,'0'); $('mForm').textContent=text(s.form); $('mVote').textContent=text(s.voteProgress); $('mScore').textContent=s.focusCount??'—';
  const club=live.club||{}; if(safeHttpUrl(club.logo))$('clubLogo').src=club.logo; $('clubSince').textContent=`SINCE ${text(club.since,'2026')}`;
  const ev=clear($('overviewEvents')); (live.events||[]).filter(x=>num(x.startsAt)>=Date.now()-86400000).slice(0,5).forEach(e=>ev.append(makeListItem(text(e.title,'Klubová akce'),`${fmt(e.startsAt).full} • ${text(e.competition||e.kindLabel||e.kind,'RYVEX')}`,text(e.kindLabel||e.kind,'EVENT').toUpperCase()))); if(!ev.children.length)ev.append(makeListItem('Žádná další akce','Kalendář zatím neobsahuje budoucí událost.','WAITING'));
  const rs=clear($('overviewResults')); (live.results||[]).slice(0,5).forEach(r=>rs.append(makeListItem(`RYVEX ${text(r.score,'–')} ${text(r.opponent,'Soupeř')}`,`${fmt(r.startsAt).date} • ${text(r.competition,'MATCH')}`,outcomeLabel(r.outcome)))); if(!rs.children.length)rs.append(makeListItem('Zatím bez výsledků','Po uložení výsledku v Manageru se objeví automaticky.','LIVE'));
  renderOverviewPoll(live.poll);
  $('systemVersion').textContent=text(live.system?.version,'RYVEX Manager'); $('systemSource').textContent=text(live.system?.source,'Discord + RYVEX Manager'); $('lastSync').textContent=fmt(live.generatedAt).full;
}

function renderOverviewPoll(poll){const box=clear($('overviewPoll')); $('overviewPollTitle').textContent=text(poll?.title,'Hlasování'); if(!poll){box.append(node('div','empty-inline','Aktuálně není otevřené hlasování.'));return;} const c=poll.counts||{}; const p=c.total?Math.round(num(c.voted)/num(c.total)*100):0; box.append(node('div','vote-time',fmt(poll.startsAt).full)); const track=node('div','progress-track'),bar=node('i');bar.style.width=`${p}%`;track.append(bar);box.append(track);const counts=node('div','vote-counts');counts.append(node('span','',`✅ ANO ${num(c.yes)}`),node('span','',`❔ MOŽNÁ ${num(c.maybe)}`),node('span','',`❌ NE ${num(c.no)}`),node('span','',`${num(c.voted)}/${num(c.total)} hlasovalo`));box.append(counts)}

function renderVote(live){const box=clear($('votePanel')),poll=live.poll;if(!poll){box.append(node('div','empty-inline','Aktuálně není otevřené hlasování. Jakmile vedení vytvoří nové, objeví se zde automaticky.'));}else{const wrap=node('div','vote-live'),head=node('div','vote-headline'),copy=node('div');copy.append(node('div','vote-time',fmt(poll.startsAt).full),node('h2','',text(poll.title,'Týmové hlasování')),node('p','',text(poll.description,'')));head.append(copy,node('span','status-pill live-ok','LIVE'));wrap.append(head);const c=poll.counts||{},p=c.total?Math.round(num(c.voted)/num(c.total)*100):0,track=node('div','progress-track'),bar=node('i');bar.style.width=`${p}%`;track.append(bar);wrap.append(track);const actions=node('div','vote-actions');[['yes','✅','ANO'],['maybe','❔','MOŽNÁ'],['no','❌','NE']].forEach(([choice,emoji,label])=>{const b=node('button',`vote-choice ${poll.myVote===choice?'active':''}`);b.type='button';b.append(node('b','',`${emoji} ${label}`),node('small','',poll.myVote===choice?'TVŮJ HLAS':'HLASOVAT'));b.addEventListener('click',()=>saveVote(poll.id,choice,b));actions.append(b)});wrap.append(actions);const counts=node('div','vote-counts');counts.append(node('span','',`ANO ${num(c.yes)}`),node('span','',`MOŽNÁ ${num(c.maybe)}`),node('span','',`NE ${num(c.no)}`),node('span','',`${num(c.voted)}/${num(c.total)} celkem`));wrap.append(counts);box.append(wrap)}
  const tbody=clear($('pollHistory'));(live.pollStats||[]).slice(0,30).forEach(p=>{const tr=node('tr'),c=p.counts||{};[text(p.title,'Hlasování'),fmt(p.startsAt).date,num(c.yes),num(c.maybe),num(c.no),`${num(c.voted)}/${num(c.total)}`].forEach(v=>tr.append(node('td','',v)));tbody.append(tr)});if(!tbody.children.length){const tr=node('tr'),td=node('td','', 'Historie zatím není dostupná.');td.colSpan=6;tr.append(td);tbody.append(tr)}}
async function saveVote(pollId,choice){try{await post('/api/vote',{pollId,choice});await loadState(true)}catch(e){alert(`Hlas se nepodařilo uložit: ${e.message}`)}}

function renderCalendar(live){const grid=clear($('calendarGrid'));(live.events||[]).slice(0,30).forEach(e=>{const card=node('article','panel calendar-card');card.append(node('div','event-date',fmt(e.startsAt).full),node('h3','',text(e.title,'Klubová akce')));if(e.description)card.append(node('p','',e.description));const meta=node('div','calendar-meta');meta.append(node('span','',text(e.kindLabel||e.kind,'EVENT').toUpperCase()));if(e.competition)meta.append(node('span','',e.competition));if(e.poll?.counts)meta.append(node('span','',`HLAS ${num(e.poll.counts.voted)}/${num(e.poll.counts.total)}`));if(e.result)meta.append(node('span','',`RESULT ${e.result}`));card.append(meta);if(e.discordUrl){const a=node('a','discord-link','Otevřít na Discordu');a.href=safeHttpUrl(e.discordUrl);a.target='_blank';a.rel='noopener noreferrer';card.append(a)}grid.append(card)});if(!grid.children.length)grid.append(node('div','panel empty-inline','Kalendář je zatím prázdný.'))}

function renderLineup(live){const box=clear($('lineupPanel')),l=live.lineup;if(!l){box.append(node('div','empty-inline','Aktuálně není uložená sestava.'));return;}const head=node('div','lineup-head'),copy=node('div');copy.append(node('div','eyebrow','CURRENT LINEUP'),node('h2','',text(l.formation,'FORMATION')),node('div','lineup-meta',`${text(l.status,'draft').toUpperCase()} • ${fmt(l.updatedAt).full}`));head.append(copy,node('span','status-pill',l.generated?'AUTO GENERATED':'LIVE'));box.append(head);const grid=node('div','lineup-grid');(l.assignments||[]).forEach(a=>{const s=node('div','lineup-slot');s.append(node('small','',text(a.slot,'POZICE')),node('b','',text(a.name,'VOLNÉ')),node('span','',text(a.position,'')));grid.append(s)});box.append(grid);if((l.substitutes||[]).length){box.append(node('div','eyebrow','SUBSTITUTES'));const subs=node('div','sub-list');l.substitutes.forEach(x=>subs.append(node('span','',`${text(x.name,'Hráč')} • ${(x.positions||[]).join('/')||'—'}`)));box.append(subs)}}

function performanceRows(live){
  if(Array.isArray(live.statistics)&&live.statistics.length)return live.statistics;
  const members=new Map((live.members||[]).map(m=>[String(m.id),m]));
  return (live.ea?.leaderboard||[]).map(r=>{const m=members.get(String(r.discordUserId||''))||{};return {userId:r.discordUserId||r.eaName,name:m.name||r.eaName||'EA Player',avatar:m.avatar||null,position:m.position||'—',appearances:num(r.appearances??r.matches??r.games),goals:num(r.goals),assists:num(r.assists),mvps:num(r.mvps??r.ryvexMvp),rating:r.rating??r.averageRating??null,ryvexScore:r.ryvexScore??r.averageRyvexScore??null,passRate:null,tackleRate:null,points:num(r.points)}});
}
function derivedRankings(rows){const top=(key)=>[...rows].filter(r=>num(r[key])>0).sort((a,b)=>num(b[key])-num(a[key])).slice(0,10);return {scorers:top('goals'),assists:top('assists'),mvps:top('mvps'),rating:[...rows].filter(r=>r.rating!=null).sort((a,b)=>num(b.rating)-num(a.rating)).slice(0,10)}}
function renderStatistics(live){const rows=performanceRows(live),tbody=clear($('statisticsTable'));rows.forEach(r=>{const tr=node('tr'),pc=node('td','player-cell');pc.append(avatar(r.avatar,r.name),node('b','',text(r.name,'Hráč')));tr.append(pc);[r.position,r.appearances,r.goals,r.assists,r.mvps,r.rating??'—',r.ryvexScore??'—',r.passRate==null?'—':`${r.passRate}%`,r.tackleRate==null?'—':`${r.tackleRate}%`].forEach(v=>tr.append(node('td','',v)));tbody.append(tr)});if(!tbody.children.length){const tr=node('tr'),td=node('td','','Statistiky se zatím synchronizují z EA / Manageru.');td.colSpan=10;tr.append(td);tbody.append(tr)}
  const grid=clear($('rankingGrid')),ranking=(live.rankings&&Object.keys(live.rankings).length)?live.rankings:derivedRankings(rows);[['TOP SCORER',ranking.scorers?.[0],'goals','gólů'],['TOP ASSIST',ranking.assists?.[0],'assists','asistencí'],['TOP MVP',ranking.mvps?.[0],'mvps','MVP'],['TOP RATING',ranking.rating?.[0],'rating','rating']].forEach(([label,r,key,suffix])=>{const c=node('article','panel ranking-card');c.append(node('small','',label),node('b','',text(r?.name,'—')),node('span','',r?`${r[key]??'—'} ${suffix}`:'Bez dat'));grid.append(c)})}

function renderActivity(live){const list=clear($('activityList'));(live.activity||[]).forEach(r=>{const c=node('article',`panel activity-card ${r.status||''}`),top=node('div','activity-top');top.append(avatar(r.avatar,r.name));const copy=node('div');copy.append(node('strong','',text(r.name,'Hráč')),node('small','',`${num(r.voted)}/${num(r.total)} hlasování • ANO ${num(r.yes)} • MOŽNÁ ${num(r.maybe)} • NE ${num(r.no)} • missed ${num(r.missed)}`));top.append(copy,node('div','activity-percent',`${pct(r.percent)}%`));c.append(top);const t=node('div','progress-track'),i=node('i');i.style.width=`${pct(r.percent)}%`;t.append(i);c.append(t);list.append(c)});if(!list.children.length)list.append(node('div','panel empty-inline','Aktivita zatím nemá historii.'))}

function renderAttendance(live){const tbody=clear($('attendanceTable'));(live.attendance||[]).forEach(r=>{const tr=node('tr'),pc=node('td','player-cell');pc.append(avatar(r.avatar,r.name),node('b','',text(r.name,'Hráč')));tr.append(pc);[r.points,r.arrived,r.late,r.excused,r.noShow,r.records].forEach(v=>tr.append(node('td','',num(v))));tbody.append(tr)});if(!tbody.children.length){const tr=node('tr'),td=node('td','','Docházka zatím nemá záznamy.');td.colSpan=7;tr.append(td);tbody.append(tr)}}

function renderMatches(live){const list=clear($('matchdayList'));const matchRows=(live.matches&&live.matches.length)?live.matches:(live.results||[]).map(r=>({...r,status:'final',players:[]}));matchRows.forEach(m=>{const c=node('article','panel match-card-os'),top=node('div','match-top');top.append(node('span','',`${outcomeLabel(m.outcome)} • ${fmt(m.startsAt).full}`),node('span','',text(m.competition,'MATCH')));c.append(top,node('h3','',`RYVEX vs ${text(m.opponent,'Soupeř')}`));if(m.score)c.append(node('div','match-score',m.score));const meta=node('div','match-details');if(m.formation)meta.append(node('span','',`FORMATION ${m.formation}`));if(m.location)meta.append(node('span','',String(m.location).toUpperCase()));if(m.mvpName)meta.append(node('span','',`MVP ${m.mvpName}`));c.append(meta);if((m.players||[]).length){const players=node('div','match-players');m.players.slice(0,14).forEach(p=>{const row=node('div','match-player');row.append(node('span','',p.name),node('span','',`⚽ ${num(p.goals)} • 🎯 ${num(p.assists)} • ⭐ ${num(p.mvp)} • ${p.rating??'—'}`));players.append(row)});c.append(players)}list.append(c)});if(!list.children.length)list.append(node('div','panel empty-inline','Matchday historie zatím není dostupná.'))}

function initPositionSelects(){[$('positionPrimary'),$('positionSecondary')].forEach(sel=>{clear(sel);sel.append(node('option','','Vyber pozici'));sel.firstChild.value='';POSITION_OPTIONS.forEach(p=>{const o=node('option','',p);o.value=p;sel.append(o)})})}
function renderPositions(live){const me=live.currentUser?.profile||{};const positionRows=(live.positions&&live.positions.length)?live.positions:(live.members||[]).map(m=>{const parts=String(m.position||'').split('/').map(x=>x.trim()).filter(Boolean);return {userId:m.id,name:m.name,avatar:m.avatar,primary:parts[0]||null,secondary:parts[1]||null}});$('positionPrimary').value=me.primary||'';$('positionSecondary').value=me.secondary||'';const canEdit=!!live.currentUser?.profile;$('savePosition').disabled=!canEdit;$('positionMessage').textContent=canEdit?'':'Zobrazení je LIVE; úprava pozic vyžaduje Manager Club OS API 5.0.3+';const roster=clear($('positionRoster'));positionRows.forEach(p=>{const c=node('article','panel position-card');c.append(avatar(p.avatar,p.name));const cp=node('div');cp.append(node('b','',text(p.name,'Hráč')),node('small','',`${text(p.primary,'—')} / ${text(p.secondary,'—')}`));c.append(cp);roster.append(c)});if(!roster.children.length)roster.append(node('div','panel empty-inline','Pozice se zatím nenačetly.'))}
$('savePosition')?.addEventListener('click',async()=>{const p=$('positionPrimary').value,s=$('positionSecondary').value,msg=$('positionMessage');if(!p||!s||p===s){msg.textContent='Vyber dvě různé pozice.';return}msg.textContent='Ukládám…';try{await post('/api/position',{primary:p,secondary:s});msg.textContent='Pozice uloženy a synchronizovány.';await loadState(true)}catch(e){msg.textContent=`Chyba: ${e.message}`}});

function renderMembers(live){const roster=clear($('memberRoster'));(live.members||[]).forEach(m=>{const card=node('article','member-roster-card'),av=node('div','member-roster-avatar');const a=avatar(m.avatar,m.name,'member-roster-avatar');if(a.tagName==='IMG')av.replaceWith(a);else av.textContent=text(m.name,'R')[0].toUpperCase();const copy=node('div');copy.append(node('strong','',text(m.name,'RYVEX member')),node('small','',`${text(m.role,'PLAYER')} • ${text(m.position,'—')}`));const dot=node('i',m.online?'online':'');if(a.tagName==='IMG')card.append(a,copy,dot);else card.append(av,copy,dot);roster.append(card)});$('memberRosterCount').textContent=`${(live.members||[]).length} MEMBERS`}

function renderSupport(live){const box=clear($('supportPanel')),support=live.support||{};if(!Array.isArray(support.types)){const wrap=node('div','open-ticket');wrap.append(node('div','eyebrow','COMPATIBILITY MODE'),node('h2','','Podpora přes Discord'),node('p','','Aktuální Manager API neposílá webový Support Center. Ostatní Club OS data se dál synchronizují automaticky.'));const guildId=String(live.club?.guildId||'');if(/^\d{15,25}$/.test(guildId)){const a=node('a','btn btn-primary','Otevřít RYVEX Discord');a.href=`https://discord.com/channels/${guildId}`;a.target='_blank';a.rel='noopener noreferrer';wrap.append(a)}box.append(wrap);return}if(support.openTicket){const open=node('div','open-ticket');open.append(node('div','eyebrow','OPEN TICKET'),node('h2','',text(support.openTicket.id,'Ticket')),node('p','',`Soukromý ticket je aktivní od ${fmt(support.openTicket.createdAt).full}.`));if(safeHttpUrl(support.openTicket.discordUrl)){const a=node('a','btn btn-primary','Otevřít ticket na Discordu');a.href=support.openTicket.discordUrl;a.target='_blank';a.rel='noopener noreferrer';open.append(a)}box.append(open);return}box.append(node('div','member-block-head'));const types=node('div','support-types');(support.types||[]).forEach(t=>{const b=node('button',`support-type ${state.supportType===t.id?'active':''}`);b.type='button';b.append(node('span','',t.emoji||'🛟'),node('b','',text(t.label,t.id)),node('small','',text(t.title,'')));b.addEventListener('click',()=>{state.supportType=t.id;renderSupport(state.live)});types.append(b)});box.append(types);const ta=node('textarea','support-note');ta.id='supportNote';ta.placeholder='Volitelně napiš krátce, co potřebuješ řešit…';box.append(ta);const action=node('button','btn btn-primary','Vytvořit soukromý ticket');action.type='button';action.addEventListener('click',async()=>{action.disabled=true;action.textContent='Vytvářím…';try{const r=await post('/api/support',{type:state.supportType,note:ta.value});if(r.ticket?.discordUrl)window.open(r.ticket.discordUrl,'_blank','noopener');await loadState(true)}catch(e){alert(`Ticket se nepodařilo vytvořit: ${e.message}`)}finally{action.disabled=false;action.textContent='Vytvořit soukromý ticket'}});box.append(action)}

async function loadChatChannels(force=false){if(state.chatLoaded&&!force)return;const box=clear($('chatChannels'));box.append(node('div','empty-inline','Načítám…'));const data=await get('/api/chat-channels');state.chatLoaded=true;clear(box);(data.channels||[]).forEach(ch=>{const b=node('button',`chat-channel ${state.chatChannelId===ch.id?'active':''}`);b.type='button';b.dataset.channelId=ch.id;b.append(node('b','',`# ${ch.name}`),node('small','',text(ch.category,'Discord')));b.addEventListener('click',()=>selectChatChannel(ch.id));box.append(b)});if(!box.children.length)box.append(node('div','empty-inline','Žádné dostupné textové kanály.'));if(!state.chatChannelId&&data.channels?.[0])selectChatChannel(data.channels[0].id)}
async function selectChatChannel(id){state.chatChannelId=String(id);document.querySelectorAll('.chat-channel').forEach(b=>b.classList.toggle('active',b.dataset.channelId===state.chatChannelId));await loadChatMessages()}
async function loadChatMessages(){if(!state.chatChannelId)return;const box=clear($('chatMessages'));box.append(node('div','empty-inline','Načítám historii…'));const data=await get(`/api/chat-messages?channelId=${encodeURIComponent(state.chatChannelId)}&limit=60`);$('chatHead').textContent=`# ${text(data.channel?.name,'Discord')}`;clear(box);(data.messages||[]).forEach(m=>{const row=node('article',`chat-message ${m.mine?'me':''}`);row.append(avatar(m.author?.avatar,m.author?.name));const body=node('div'),head=node('div');head.append(node('b','',text(m.author?.name,'Discord')),node('small','',fmt(m.createdAt).full));body.append(head);if(m.content)body.append(node('p','',m.content));(m.attachments||[]).forEach(a=>{const url=safeHttpUrl(a.url);if(url){const link=node('a','discord-link',`Příloha: ${text(a.name,'soubor')}`);link.href=url;link.target='_blank';link.rel='noopener noreferrer';body.append(link)}});row.append(body);box.append(row)});if(!box.children.length)box.append(node('div','empty-inline','V kanálu zatím není dostupná historie.'));box.scrollTop=box.scrollHeight}
function renderChatError(e){clear($('chatMessages')).append(node('div','empty-inline',`Chat není dostupný: ${e.message}`))}
$('chatForm')?.addEventListener('submit',async e=>{e.preventDefault();const input=$('chatInput'),content=input.value.trim();if(!content||!state.chatChannelId)return;input.disabled=true;try{await post('/api/chat-send',{channelId:state.chatChannelId,content});input.value='';await loadChatMessages()}catch(err){alert(`Zprávu se nepodařilo odeslat: ${err.message}`)}finally{input.disabled=false;input.focus()}});

async function loadVoice(){const data=await get('/api/voice'),grid=clear($('voiceGrid'));(data.channels||[]).forEach(ch=>{const c=node('article','panel voice-card');c.append(node('div','eyebrow',text(ch.category,'VOICE')),node('h3','',text(ch.name,'Voice')),node('small','',`${(ch.members||[]).length}${ch.userLimit?`/${ch.userLimit}`:''} členů`));const members=node('div','voice-members');(ch.members||[]).forEach(m=>{const row=node('div','voice-member');row.append(avatar(m.avatar,m.name),node('span','',`${text(m.name,'Hráč')}${m.muted?' • muted':''}`));members.append(row)});if(!members.children.length)members.append(node('div','empty-inline','Místnost je prázdná.'));c.append(members);if(ch.canConnect&&safeHttpUrl(ch.discordUrl)){const a=node('a','discord-link','Připojit přes Discord');a.href=ch.discordUrl;a.target='_blank';a.rel='noopener noreferrer';c.append(a)}grid.append(c)});if(!grid.children.length)grid.append(node('div','panel empty-inline','Žádné dostupné voice místnosti.'))}
function renderVoiceError(e){clear($('voiceGrid')).append(node('div','panel empty-inline',`Voice není dostupný: ${e.message}`))}

function renderMedia(live){const r=live.radio||{};$('radioName').textContent=text(r.name,'RYVEX Radio');$('radioSubtitle').textContent=text(r.subtitle,'24/7 club stream');const audio=$('radioPlayer'),stream=safeHttpUrl(r.streamUrl);if(stream&&audio.src!==stream)audio.src=stream;$('radioMeta').textContent=r.online?`ONLINE • ${text(r.codec,'stream')}${r.bitrate?` • ${r.bitrate} kbps`:''}`:'Manager stream připraven';}
async function loadYoutube(){const frame=$('memberStream');const old=frame.querySelector('iframe');if(old)old.remove();const data=await get('/api/youtube-live').catch(()=>({online:false}));const placeholder=frame.querySelector('.stream-placeholder');if(data.online&&/^[A-Za-z0-9_-]{6,20}$/.test(data.videoId||'')){if(placeholder)placeholder.hidden=true;const iframe=node('iframe');iframe.src=`https://www.youtube-nocookie.com/embed/${data.videoId}?rel=0`;iframe.title=text(data.title,'RYVEX LIVE');iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true;frame.append(iframe)}else if(placeholder){placeholder.hidden=false;placeholder.querySelector('strong').textContent='OFFLINE';placeholder.querySelector('small').textContent='Stream se zobrazí automaticky po spuštění YouTube LIVE.'}}

function setCapabilityCard(id, allowed, allowedText='POVOLENO', deniedText='BEZ OPRÁVNĚNÍ'){
  const textEl=$(id); if(!textEl)return;
  textEl.textContent=allowed?allowedText:deniedText;
  const card=textEl.closest('.admin-capability'); if(card){card.classList.toggle('allowed',allowed);card.classList.toggle('denied',!allowed);}
}
function renderActivePollAdmin(live, canPoll){
  const shell=$('activePollAdmin'),box=$('activePollAdminBody'); if(!shell||!box)return;
  shell.hidden=!canPoll; clear(box); if(!canPoll)return;
  const poll=live.poll;
  if(!poll){box.append(node('div','empty-inline','Aktuálně není otevřené hlasování.'));return;}
  const copy=node('div','admin-live-poll'); copy.append(node('strong','',text(poll.title,'Hlasování')),node('small','',`${fmt(poll.startsAt).full} • ${num(poll.counts?.voted)}/${num(poll.counts?.total)} hlasovalo`));
  const actions=node('div','admin-live-actions'); const close=node('button','btn btn-danger','Ukončit hlasování'); close.type='button'; close.dataset.closePoll=String(poll.id); actions.append(close); box.append(copy,actions);
}
function requestTypeLabel(type){return type==='recruitment'?'NÁBOR':type==='merch'?'MERCH':String(type||'REQUEST').toUpperCase()}
function requestStatusLabel(status){return ({new:'NOVÉ',reviewing:'ŘEŠÍ SE',approved:'SCHVÁLENO',rejected:'ZAMÍTNUTO',closed:'UZAVŘENO'})[status]||String(status||'new').toUpperCase()}
function renderAdminRequests(){
  const box=clear($('adminRequestList')); if(!box)return;
  const filter=state.adminRequestFilter; const rows=(state.adminRequests||[]).filter(r=>filter==='all'||r.type===filter||r.status===filter);
  if(!rows.length){box.append(node('div','empty-inline',state.adminRequestsLoaded?'Žádné požadavky v tomto filtru.':'Požadavky se načítají…'));return;}
  rows.forEach(r=>{
    const article=node('article','admin-request'),main=node('div','admin-request-main'),head=node('div','admin-request-head');
    head.append(node('strong','',text(r.requesterName,'Discord user')));
    const type=node('span','admin-request-type',requestTypeLabel(r.type)); const status=node('span','admin-request-status',requestStatusLabel(r.status)); status.dataset.status=String(r.status||'new'); head.append(type,status); main.append(head);
    main.append(node('div','admin-request-meta',`${text(r.id,'REQUEST')} • ${fmt(r.createdAt).full}${r.processedByName?` • ${text(r.processedByName)}`:''}`));
    const fields=node('div','admin-request-fields'); Object.entries(r.data||{}).slice(0,10).forEach(([k,v])=>{const row=node('div');row.append(node('small','',k),node('span','',text(v,'')));fields.append(row)}); main.append(fields);
    const actions=node('div','admin-request-actions');
    [['reviewing','Řešit'],['approved','Schválit'],['rejected','Zamítnout'],['closed','Uzavřít']].forEach(([statusValue,label])=>{const b=node('button','',label);b.type='button';b.dataset.requestId=String(r.id);b.dataset.status=statusValue;b.disabled=r.status===statusValue;actions.append(b)});
    article.append(main,actions); box.append(article);
  });
}
async function loadAdminRequests(force=false){
  if(state.adminRequestsLoading)return; if(state.adminRequestsLoaded&&!force){renderAdminRequests();return;}
  state.adminRequestsLoading=true; const box=$('adminRequestList'); if(box&&!state.adminRequestsLoaded)box.innerHTML='<div class="empty-inline">Načítám požadavky…</div>';
  try{const data=await get('/api/admin-requests');state.adminRequests=Array.isArray(data.requests)?data.requests:[];state.adminRequestsLoaded=true;renderAdminRequests()}catch(err){if(box)box.innerHTML=`<div class="empty-inline">Inbox není dostupný: ${text(err.message)}</div>`}finally{state.adminRequestsLoading=false}
}
async function setAdminRequestStatus(requestId,status,button){
  if(button)button.disabled=true; try{await post('/api/admin-request-status',{requestId,status});await loadAdminRequests(true)}catch(err){alert(`Stav požadavku se nepodařilo změnit: ${err.message}`)}finally{if(button)button.disabled=false}
}
function renderManagement(live){
  const owner=!!live.permissions?.isOwner, canPoll=hasPermission(live,'poll'), canAnnouncement=hasPermission(live,'announcement'), canRecruitment=hasPermission(live,'recruitment'), canSport=hasPermission(live,'sport'), canManage=canPoll||canAnnouncement||canRecruitment||canSport;
  document.querySelectorAll('.management-only').forEach(x=>x.hidden=!canManage);
  if($('mobileManagement'))$('mobileManagement').hidden=!canManage;
  document.querySelectorAll('[data-admin-capability="poll"]').forEach(x=>x.hidden=!canPoll);
  document.querySelectorAll('[data-admin-capability="announcement"]').forEach(x=>x.hidden=!canAnnouncement);
  document.querySelectorAll('[data-admin-capability="recruitment"]').forEach(x=>x.hidden=!canRecruitment);
  setCapabilityCard('capPoll',canPoll); setCapabilityCard('capAnnouncement',canAnnouncement); setCapabilityCard('capRecruitment',canRecruitment); setCapabilityCard('capSport',canSport,owner?'FULL CONTROL':'ROLE CONTROL');
  renderActivePollAdmin(live,canPoll);
  if($('managementBadge'))$('managementBadge').textContent=owner?'OWNER • FULL ACCESS':'DISCORD ROLE • CONTROL';
  if($('managementScope')){
    const roles=[]; if(owner)roles.push('OWNER'); if(canPoll)roles.push('HLASOVÁNÍ'); if(canAnnouncement)roles.push('OZNÁMENÍ'); if(canRecruitment)roles.push('NÁBOR'); if(canSport)roles.push('SPORT');
    $('managementScope').textContent=roles.length?roles.join(' • '):'READ ONLY';
  }
  if(canRecruitment&&state.page==='management')loadAdminRequests(false).catch(()=>{});
  if(!canManage&&state.page==='management')showPage('overview');
}
$('pollCreateForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,msg=f.querySelector('.action-message'),fd=new FormData(f);const startsAt=new Date(fd.get('startsAt')).getTime();msg.textContent='Vytvářím…';try{await post('/api/manage',{action:'create_poll',title:fd.get('title'),description:fd.get('description'),startsAt});msg.textContent='Hlasování vytvořeno a hráčům odesláno soukromě přes Discord DM.';f.reset();await loadState(true)}catch(err){msg.textContent=`Chyba: ${err.message}`}});
$('announcementForm')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,msg=f.querySelector('.action-message'),fd=new FormData(f);msg.textContent='Publikuji…';try{await post('/api/manage',{action:'announcement',title:fd.get('title'),text:fd.get('description')});msg.textContent='Oznámení publikováno na Discord a hráčům odesláno soukromě přes Discord DM.';f.reset()}catch(err){msg.textContent=`Chyba: ${err.message}`}});
$('activePollAdminBody')?.addEventListener('click',async e=>{const b=e.target.closest('[data-close-poll]');if(!b)return;if(!confirm('Opravdu ukončit aktuální hlasování?'))return;b.disabled=true;b.textContent='Ukončuji…';try{await post('/api/manage',{action:'close_poll',pollId:b.dataset.closePoll});await loadState(true)}catch(err){alert(`Hlasování se nepodařilo ukončit: ${err.message}`)}finally{b.disabled=false}});
$('refreshAdminRequests')?.addEventListener('click',()=>loadAdminRequests(true));
document.querySelectorAll('[data-request-filter]').forEach(b=>b.addEventListener('click',()=>{state.adminRequestFilter=b.dataset.requestFilter||'all';document.querySelectorAll('[data-request-filter]').forEach(x=>x.classList.toggle('active',x===b));renderAdminRequests()}));
$('adminRequestList')?.addEventListener('click',e=>{const b=e.target.closest('[data-request-id][data-status]');if(!b)return;setAdminRequestStatus(b.dataset.requestId,b.dataset.status,b)});

function renderAll(live){state.live=live;renderIdentity(live);renderOverview(live);renderVote(live);renderCalendar(live);renderLineup(live);renderStatistics(live);renderActivity(live);renderAttendance(live);renderMatches(live);renderPositions(live);renderMembers(live);renderSupport(live);renderMedia(live);renderManagement(live);$('syncState').textContent='DISCORD LIVE';document.documentElement.dataset.clubOsLive='true'}

let loading=false;
async function loadState(silent=false){if(loading)return;loading=true;try{const live=await get('/api/member-state');renderAll(live);$('memberError').hidden=true;if(!silent){const requested=new URL(location.href).searchParams.get('page')||'overview';showPage(requested)}}catch(err){document.documentElement.dataset.clubOsLive='false';$('syncState').textContent='BRIDGE OFFLINE';$('memberErrorText').textContent=`Club OS se nepodařilo načíst: ${err.message}`;$('memberError').hidden=false;if(/unauthorized|membership_inactive|club_member_required|wrong_guild/i.test(err.message))location.replace('/?auth=not_active_member#members')}finally{loading=false}}

initPositionSelects();
loadState(false);
setInterval(()=>loadState(true),15000);
setInterval(()=>{if(state.page==='chat'&&state.chatChannelId)loadChatMessages().catch(()=>{})},10000);
setInterval(()=>{if(state.page==='voice')loadVoice().catch(()=>{})},15000);
