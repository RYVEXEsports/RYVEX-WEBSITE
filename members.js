const $ = id => document.getElementById(id);

function fmt(ts) {
  const n = Number(ts || 0);
  if (!n) return "TBA";
  return new Intl.DateTimeFormat("cs-CZ", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(n));
}

function item(title, meta, badge = "") {
  const row = document.createElement("article");
  row.className = "member-list-item";
  const left = document.createElement("div");
  const strong = document.createElement("strong"); strong.textContent = title || "RYVEX";
  const small = document.createElement("small"); small.textContent = meta || "";
  left.append(strong, small);
  const span = document.createElement("span"); span.textContent = badge || "LIVE";
  row.append(left, span);
  return row;
}

function rosterCard(member) {
  const card = document.createElement("article"); card.className = "member-roster-card";
  const avatar = document.createElement("div"); avatar.className = "member-roster-avatar";
  if (member.avatar) { const img = document.createElement("img"); img.src = member.avatar; img.alt = ""; img.referrerPolicy = "no-referrer"; avatar.append(img); }
  else avatar.textContent = String(member.name || "R").charAt(0).toUpperCase();
  const copy = document.createElement("div");
  const strong = document.createElement("strong"); strong.textContent = member.name || "RYVEX member";
  const small = document.createElement("small"); small.textContent = `${member.role || "PLAYER"} • ${member.position || "—"}`;
  copy.append(strong, small);
  const dot = document.createElement("i"); dot.className = member.online ? "online" : ""; dot.title = member.online ? "Online" : "Offline";
  card.append(avatar, copy, dot);
  return card;
}

async function load() {
  try {
    const r = await fetch("/api/member-state", { cache: "no-store", credentials: "same-origin" });
    const data = await r.json();
    if (r.status === 401) { location.replace("/#members"); return; }
    if (!r.ok || !data?.ok) throw new Error(data?.error || `HTTP ${r.status}`);

    const viewer = data.viewer || {};
    const identity = $("memberIdentity");
    identity.replaceChildren();
    const av = document.createElement("div"); av.className = "member-avatar";
    if (viewer.avatar) { const img = document.createElement("img"); img.src = viewer.avatar; img.alt = ""; av.append(img); } else av.textContent = String(viewer.name || "R").charAt(0).toUpperCase();
    const copy = document.createElement("div");
    const sm = document.createElement("small"); sm.textContent = "VERIFIED RYVEX MEMBER";
    const st = document.createElement("strong"); st.textContent = viewer.name || "RYVEX member";
    const sp = document.createElement("span"); sp.textContent = "Discord membership verified";
    copy.append(sm, st, sp); identity.append(av, copy);

    $("mMembers").textContent = String(data.summary?.members ?? "—").padStart(2, "0");
    $("mOnline").textContent = String(data.summary?.online ?? "—").padStart(2, "0");
    $("mWins").textContent = String(data.summary?.wins ?? "—").padStart(2, "0");
    $("mForm").textContent = String(data.summary?.form || "—");

    const ev = $("memberEvents"); ev.replaceChildren();
    (data.events || []).slice(0, 6).forEach(e => ev.append(item(e.title || "RYVEX event", `${fmt(e.startsAt)} • ${e.competition || e.kind || "Club event"}`, e.kind || "EVENT")));
    if (!ev.children.length) ev.append(item("Žádná naplánovaná akce", "RYVEX Manager zatím nevrátil další událost.", "WAITING"));

    const rs = $("memberResults"); rs.replaceChildren();
    (data.results || []).slice(0, 6).forEach(x => rs.append(item(`RYVEX ${x.score || "–"} ${x.opponent || "OPPONENT"}`, `${fmt(x.startsAt)} • ${x.competition || "MATCH"}`, x.outcome || "RESULT")));
    if (!rs.children.length) rs.append(item("Zatím bez výsledků", "Výsledky se synchronizují z RYVEX Manageru.", "LIVE"));

    const roster = $("memberRoster"); roster.replaceChildren();
    (data.members || []).forEach(m => roster.append(rosterCard(m)));
    $("memberRosterCount").textContent = `${(data.members || []).length} MEMBERS`;
    $("memberDashboard").hidden = false;
  } catch (err) {
    $("memberErrorText").textContent = `Member Zone se nepodařilo načíst: ${err.message}`;
    $("memberError").hidden = false;
  }
}

load();
