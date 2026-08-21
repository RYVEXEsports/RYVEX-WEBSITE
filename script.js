const FALLBACK_PLAYERS = [
  { name: "AINSLEYCZ", role: "OWNER / PLAYER", position: "SO / HU", online: true },
  { name: "MAAAGNATEK", role: "COACH / PLAYER", position: "SZ", online: false },
  { name: "RODRIGO", role: "COACH / PLAYER", position: "SOZ", online: false },
  { name: "ČEJKYS", role: "PLAYER", position: "POZ", online: false }
];

const els = {
  rosterGrid: document.getElementById("rosterGrid"),
  rosterNote: document.getElementById("rosterNote"),
  resultsGrid: document.getElementById("resultsGrid"),
  matchStatus: document.getElementById("matchStatus"),
  nextOpponent: document.getElementById("nextOpponent"),
  nextMatchTime: document.getElementById("nextMatchTime"),
  opponentName: document.getElementById("opponentName"),
  opponentCompetition: document.getElementById("opponentCompetition"),
  statMembers: document.getElementById("statMembers"),
  statOnline: document.getElementById("statOnline"),
  statWins: document.getElementById("statWins"),
  statForm: document.getElementById("statForm"),
  miniMembers: document.getElementById("miniMembers"),
  miniOnline: document.getElementById("miniOnline"),
  miniStreamState: document.getElementById("miniStreamState"),
  streamFrame: document.getElementById("streamFrame"),
  streamPlaceholder: document.getElementById("streamPlaceholder"),
  liveDot: document.getElementById("liveDot")
};

function safeUrl(value, allowedHosts = []) {
  try {
    const u = new URL(String(value || ""), location.origin);
    if (u.protocol !== "https:") return "";
    if (allowedHosts.length && !allowedHosts.some(host => u.hostname === host || u.hostname.endsWith(`.${host}`))) return "";
    return u.href;
  } catch {
    return "";
  }
}

function initials(name) {
  return String(name || "RYVEX")
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function makePlayerCard(player, index) {
  const card = document.createElement("article");
  card.className = "player-card reveal visible";

  const number = document.createElement("div");
  number.className = "number";
  number.textContent = `#${String(index + 1).padStart(2, "0")}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  const avatarUrl = safeUrl(player.avatar, ["cdn.discordapp.com", "media.discordapp.net"]);
  if (avatarUrl) {
    const img = document.createElement("img");
    img.src = avatarUrl;
    img.alt = "";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => {
      img.remove();
      avatar.textContent = initials(player.name);
    }, { once: true });
    avatar.appendChild(img);
  } else {
    avatar.textContent = initials(player.name);
  }

  const presence = document.createElement("span");
  presence.className = player.online ? "presence online" : "presence";
  presence.textContent = player.online ? "ONLINE" : "MEMBER";

  const name = document.createElement("h3");
  name.textContent = player.name || "RYVEX PLAYER";

  const meta = document.createElement("p");
  meta.textContent = `${player.role || "PLAYER"} • ${player.position || player.pos || "—"}`;

  card.append(number, avatar, presence, name, meta);
  return card;
}

function renderRoster(players, live = false) {
  if (!els.rosterGrid) return;
  els.rosterGrid.replaceChildren();
  (players?.length ? players : FALLBACK_PLAYERS).slice(0, 16).forEach((player, index) => {
    els.rosterGrid.appendChild(makePlayerCard(player, index));
  });
  if (els.rosterNote) {
    els.rosterNote.textContent = live
      ? `Discord LIVE • ${players.length} členů • automatická synchronizace každých 30 s.`
      : "Offline náhled • živá data se aktivují po nastavení Cloudflare bridge.";
  }
}

function formatDateTime(ts) {
  const n = Number(ts || 0);
  if (!Number.isFinite(n) || n <= 0) return { date: "TBA", time: "ONLINE", full: "TBA • ONLINE" };
  const d = new Date(n);
  return {
    date: new Intl.DateTimeFormat("cs-CZ", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d),
    time: new Intl.DateTimeFormat("cs-CZ", { hour: "2-digit", minute: "2-digit" }).format(d),
    full: `${new Intl.DateTimeFormat("cs-CZ", { day: "2-digit", month: "2-digit" }).format(d)} • ${new Intl.DateTimeFormat("cs-CZ", { hour: "2-digit", minute: "2-digit" }).format(d)}`
  };
}

function pickNextMatch(events = []) {
  const now = Date.now();
  const future = events.filter(e => Number(e?.startsAt || 0) >= now).sort((a, b) => Number(a.startsAt) - Number(b.startsAt));
  const matchLike = future.find(e => /match|zápas|zapas|league|liga|turnaj|pcg|vpg|prestige/i.test(`${e.title || ""} ${e.kind || ""} ${e.competition || ""}`));
  return matchLike || future[0] || null;
}

function extractOpponent(event) {
  const raw = String(event?.title || "").trim();
  const vs = raw.match(/(?:RYVEX(?:\s+ESPORTS)?\s*)?(?:vs\.?|v\.|–|—|-)\s*(.+)$/i);
  if (vs?.[1]) return vs[1].trim();
  return raw && !/^training|trénink|trenink|turnaj|tournament$/i.test(raw) ? raw : "OPPONENT";
}

function renderMatch(state) {
  const next = pickNextMatch(state.events || []);
  if (next) {
    const opponent = extractOpponent(next);
    const dt = formatDateTime(next.startsAt);
    els.nextOpponent.textContent = opponent;
    els.nextMatchTime.textContent = `${dt.full} • ONLINE`;
    els.opponentName.textContent = opponent.toUpperCase().slice(0, 28);
    els.opponentCompetition.textContent = String(next.competition || next.kind || "RYVEX EVENT").toUpperCase().slice(0, 32);
    els.matchStatus.textContent = "DISCORD LIVE";
    els.matchStatus.classList.add("live-ok");
  } else {
    els.nextOpponent.textContent = "Další zápas zatím není naplánovaný";
    els.nextMatchTime.textContent = "DISCORD LIVE • WAITING";
    els.opponentName.textContent = "OPPONENT";
    els.opponentCompetition.textContent = "COMING SOON";
    els.matchStatus.textContent = "NO FIXTURE";
  }
}

function resultCard(result) {
  const article = document.createElement("article");
  article.className = "result-card";
  const top = document.createElement("div");
  const badge = document.createElement("span");
  badge.className = `badge outcome-${String(result.outcome || "").toLowerCase()}`;
  badge.textContent = result.outcome === "W" ? "WIN" : result.outcome === "L" ? "LOSS" : result.outcome === "D" ? "DRAW" : "RESULT";
  const muted = document.createElement("span");
  muted.className = "muted";
  muted.textContent = result.competition || "MATCH";
  top.append(badge, muted);

  const score = document.createElement("strong");
  score.textContent = `RYVEX ${result.score || "–"} ${String(result.opponent || "OPPONENT").toUpperCase()}`;
  const small = document.createElement("small");
  const dt = formatDateTime(result.startsAt);
  small.textContent = `${dt.date} • synchronizováno z RYVEX Manageru`;
  article.append(top, score, small);
  return article;
}

function renderResults(results = []) {
  if (!els.resultsGrid) return;
  els.resultsGrid.replaceChildren();
  if (!results.length) {
    const empty = document.createElement("article");
    empty.className = "result-card";
    const top = document.createElement("div");
    const badge = document.createElement("span"); badge.className = "badge"; badge.textContent = "RESULTS";
    const muted = document.createElement("span"); muted.className = "muted"; muted.textContent = "DISCORD LIVE";
    top.append(badge, muted);
    const strong = document.createElement("strong"); strong.textContent = "Zatím bez výsledku";
    const small = document.createElement("small"); small.textContent = "Jakmile RYVEX Manager uloží výsledek, zobrazí se tady automaticky.";
    empty.append(top, strong, small);
    els.resultsGrid.appendChild(empty);
    return;
  }
  results.slice(0, 2).forEach(result => els.resultsGrid.appendChild(resultCard(result)));
}

function renderStats(state) {
  const members = Array.isArray(state.members) ? state.members : [];
  const memberCount = Number(state.summary?.members ?? members.length ?? 0);
  const online = Number(state.summary?.online ?? members.filter(m => m.online).length ?? 0);
  const wins = Number(state.summary?.wins ?? 0);
  const form = String(state.summary?.form || "—").slice(0, 9);
  els.statMembers.textContent = String(memberCount).padStart(2, "0");
  els.statOnline.textContent = String(online).padStart(2, "0");
  els.statWins.textContent = String(wins).padStart(2, "0");
  els.statForm.textContent = form;
  els.miniMembers.textContent = String(memberCount).padStart(2, "0");
  els.miniOnline.textContent = String(online).padStart(2, "0");
}

async function pullSiteLive() {
  try {
    const response = await fetch("/api/site-live", { cache: "no-store", credentials: "same-origin" });
    const state = await response.json();
    if (!response.ok || !state?.ok) throw new Error(state?.error || `HTTP ${response.status}`);
    renderRoster(Array.isArray(state.members) && state.members.length ? state.members : FALLBACK_PLAYERS, Array.isArray(state.members) && state.members.length > 0);
    if (!Array.isArray(state.members) || !state.members.length) {
      if (els.rosterNote) els.rosterNote.textContent = "Aktivní klubová soupiska • LIVE synchronizace z RYVEX Manageru.";
    }
    renderStats(state);
    renderMatch(state);
    renderResults(state.results || []);
    document.documentElement.dataset.discordLive = "true";
  } catch (error) {
    console.warn("[RYVEX website] Discord live unavailable:", error.message);
    renderRoster(FALLBACK_PLAYERS, false);
    els.matchStatus.textContent = "BRIDGE OFFLINE";
    els.matchStatus.classList.remove("live-ok");
    document.documentElement.dataset.discordLive = "false";
  }
}

function renderStreamOffline(message = "Jakmile spustíš veřejný stream, objeví se tady automaticky.") {
  els.streamFrame.querySelector("iframe")?.remove();
  els.streamPlaceholder.hidden = false;
  els.streamPlaceholder.replaceChildren();
  const play = document.createElement("div"); play.className = "play"; play.textContent = "▶";
  const strong = document.createElement("strong"); strong.textContent = "RYVEX LIVE";
  const small = document.createElement("small"); small.textContent = message;
  els.streamPlaceholder.append(play, strong, small);
  els.liveDot.innerHTML = "<span></span> OFFLINE";
  els.liveDot.classList.remove("online");
  els.miniStreamState.textContent = "OFFLINE";
}

function renderStreamOnline(videoId, title) {
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(videoId || "")) return renderStreamOffline();
  els.streamFrame.querySelector("iframe")?.remove();
  els.streamPlaceholder.hidden = true;
  const iframe = document.createElement("iframe");
  iframe.className = "stream-embed";
  iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
  iframe.title = title || "RYVEX live stream";
  iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  els.streamFrame.appendChild(iframe);
  els.liveDot.innerHTML = "<span></span> LIVE NOW";
  els.liveDot.classList.add("online");
  els.miniStreamState.textContent = "LIVE NOW";
}

async function pullYouTubeLive() {
  try {
    const response = await fetch("/api/youtube-live", { cache: "no-store", credentials: "same-origin" });
    const data = await response.json();
    if (!response.ok && data?.error !== "youtube_api_not_configured") throw new Error(data?.error || `HTTP ${response.status}`);
    if (data?.online && data.videoId) renderStreamOnline(data.videoId, data.title);
    else renderStreamOffline(data?.error === "youtube_api_not_configured" ? "YouTube LIVE se aktivuje po nastavení YOUTUBE_API_KEY v Cloudflare." : undefined);
  } catch (error) {
    console.warn("[RYVEX website] YouTube live unavailable:", error.message);
    renderStreamOffline("YouTube LIVE je momentálně nedostupný. Zkusím to znovu automaticky.");
  }
}

renderRoster(FALLBACK_PLAYERS, false);
pullSiteLive();
pullYouTubeLive();
setInterval(pullSiteLive, 30_000);
setInterval(pullYouTubeLive, 60_000);

document.getElementById("year").textContent = new Date().getFullYear();

const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
toggle?.addEventListener("click", () => {
  nav.classList.toggle("open");
  toggle.setAttribute("aria-expanded", nav.classList.contains("open"));
});
nav?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
  nav.classList.remove("open");
  toggle.setAttribute("aria-expanded", "false");
}));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach(el => observer.observe(el));


async function checkMemberAccess() {
  const button = document.getElementById("memberGateButton");
  const title = document.getElementById("memberGateTitle");
  const text = document.getElementById("memberGateText");
  const navCta = document.getElementById("memberNavCta");
  const visitorButton = document.getElementById("visitorGateButton");
  const visitorTitle = document.getElementById("visitorGateTitle");
  const visitorNav = document.getElementById("visitorNavCta");
  const message = document.getElementById("authMessage");

  const authError = new URLSearchParams(location.search).get("auth");
  if (message && authError) {
    const messages = {
      not_member: "Tento Discord účet není na klubovém Discordu. Club OS zůstává uzamčený.",
      not_active_member: "Discord účet je rozpoznaný, ale není vedený jako aktivní člen RYVEX Esports. Club OS zůstává uzamčený.",
      membership_check_failed: "Aktivní členství se teď nepodařilo bezpečně ověřit proti RYVEX Manageru. Zkus to za chvíli znovu.",
      invalid_state: "Přihlášení vypršelo nebo bylo přerušeno. Zkus ověření znovu.",
      not_configured: "RYVEX přihlášení ještě není kompletně nastavené v Cloudflare.",
      discord_error: "Discord ověření se nepodařilo dokončit. Zkus to znovu."
    };
    message.textContent = messages[authError] || "Přihlášení se nepodařilo dokončit.";
    message.hidden = false;
    history.replaceState({}, "", `${location.pathname}${location.hash || "#members"}`);
  }

  try {
    const response = await fetch("/api/me", { cache: "no-store", credentials: "same-origin" });
    const data = await response.json();
    if (!data?.authenticated) return;

    if (data.accessType === "visitor") {
      if (visitorTitle) visitorTitle.textContent = `Vítej, ${data.user?.name || "RYVEX fan"}`;
      if (visitorButton) { visitorButton.textContent = "Otevřít Fan Zone"; visitorButton.href = "/visitor.html"; }
      if (visitorNav) { visitorNav.textContent = "Fan Zone ✓"; visitorNav.href = "/visitor.html"; }
      return;
    }

    if (data.activeMember) {
      if (title) title.textContent = `Vítej, ${data.user?.name || "RYVEX member"}`;
      if (text) text.textContent = "Aktivní členství je ověřené přes RYVEX Manager. Můžeš vstoupit do soukromého Club OS.";
      if (button) { button.textContent = "Otevřít Club OS"; button.href = "/members.html"; }
      if (navCta) { navCta.innerHTML = "<span>CLUB OS ✓</span><small>ACTIVE MEMBER</small>"; navCta.href = "/members.html"; }
    } else {
      if (text) text.textContent = "Tahle session už nemá aktivní klubový přístup. Přihlášení se musí znovu ověřit.";
      if (button) { button.textContent = "Ověřit členství znovu"; button.href = "/auth/login?mode=club"; }
    }
  } catch {}
}

checkMemberAccess();

/* RYVEX WEBSITE 2.0.1 • privacy-friendly visitor counter
   Uses an anonymous browser UUID and optional Cloudflare KV binding RYVEX_VISITORS. */
async function pullVisitorCount() {
  const shell = document.getElementById("visitorCounter");
  const countEl = document.getElementById("visitorCount");
  if (!shell || !countEl) return;

  try {
    let visitorId = "";
    try {
      visitorId = localStorage.getItem("ryvex_visitor_id") || "";
      if (!visitorId) {
        visitorId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
        localStorage.setItem("ryvex_visitor_id", visitorId);
      }
    } catch {
      visitorId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
    }

    const response = await fetch("/api/visitors", {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId })
    });
    const data = await response.json();
    if (!response.ok || !data?.ok || !data?.configured || !Number.isFinite(Number(data.count))) return;

    countEl.textContent = new Intl.NumberFormat("cs-CZ").format(Number(data.count));
    shell.hidden = false;
  } catch (error) {
    console.warn("[RYVEX website] Visitor counter unavailable:", error?.message || error);
  }
}

pullVisitorCount();

