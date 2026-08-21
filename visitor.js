const $ = id => document.getElementById(id);
const safe = v => String(v ?? '').trim();

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) throw new Error(data?.error || `HTTP ${response.status}`);
  return data;
}

function renderIdentity(data) {
  const box = $('visitorIdentity');
  if (!box) return;
  const name = safe(data.user?.name) || 'RYVEX visitor';
  const avatar = safe(data.user?.avatar);
  box.replaceChildren();
  if (avatar) {
    const img = document.createElement('img'); img.src = avatar; img.alt = ''; img.referrerPolicy = 'no-referrer'; box.append(img);
  } else {
    const mark = document.createElement('div'); mark.className = 'member-lock'; mark.textContent = 'R'; box.append(mark);
  }
  const copy = document.createElement('div');
  const small = document.createElement('small'); small.textContent = 'DISCORD VERIFIED';
  const strong = document.createElement('strong'); strong.textContent = name;
  const span = document.createElement('span'); span.textContent = data.accessType === 'club' && data.activeMember ? 'CLUB MEMBER • FAN VIEW' : 'LIMITED FAN ACCESS';
  copy.append(small, strong, span); box.append(copy);
}

function renderPublic(live) {
  const s = live.summary || {};
  $('vMembers').textContent = s.members ?? '—'; $('vOnline').textContent = s.online ?? '—'; $('vWins').textContent = s.wins ?? '—'; $('vForm').textContent = safe(s.form) || '—';
  const event = (live.events || [])[0];
  const match = $('visitorMatch');
  if (!match) return;
  if (!event) { match.textContent = 'Další zápas zatím není zveřejněný.'; return; }
  const date = event.startsAt ? new Intl.DateTimeFormat('cs-CZ',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(event.startsAt)) : 'TBA';
  match.innerHTML = '';
  const strong = document.createElement('strong'); strong.textContent = safe(event.title) || 'RYVEX match';
  const span = document.createElement('span'); span.textContent = `${date} • ${safe(event.competition || event.kind) || 'MATCH'}`;
  match.append(strong, span);
}

async function init() {
  try {
    const me = await jsonFetch('/api/me');
    if (!me.authenticated) { location.replace('/auth/login?mode=visitor'); return; }
    renderIdentity(me);
  } catch { location.replace('/auth/login?mode=visitor'); return; }
  jsonFetch('/api/site-live').then(renderPublic).catch(() => {});
}

async function submitForm(form, endpoint, messageId) {
  const message = $(messageId); const button = form.querySelector('button[type="submit"]');
  message.textContent = 'Odesílám…'; button.disabled = true;
  try {
    const body = Object.fromEntries(new FormData(form).entries());
    await jsonFetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    message.textContent = 'Hotovo. Požadavek byl předán vedení RYVEX.'; form.reset();
  } catch (error) {
    message.textContent = error.message === 'public_request_bridge_not_configured' ? 'Web je připravený, ale příjem požadavků ještě není propojený s Managerem.' : `Nepodařilo se odeslat: ${error.message}`;
  } finally { button.disabled = false; }
}

$('recruitmentForm')?.addEventListener('submit', e => { e.preventDefault(); submitForm(e.currentTarget, '/api/recruitment', 'recruitmentMessage'); });
$('merchForm')?.addEventListener('submit', e => { e.preventDefault(); submitForm(e.currentTarget, '/api/merch-interest', 'merchMessage'); });
init();
