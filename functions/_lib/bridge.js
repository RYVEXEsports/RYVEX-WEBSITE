function cleanText(value, max = 120) {
  return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
}

function httpsUrl(value, allowed = []) {
  try {
    const u = new URL(String(value || ""));
    if (u.protocol !== "https:") return null;
    if (allowed.length && !allowed.some(host => u.hostname === host || u.hostname.endsWith(`.${host}`))) return null;
    return u.href;
  } catch {
    return null;
  }
}

export function sanitizeMemberState(body) {
  const members = Array.isArray(body?.members) ? body.members.slice(0, 64).map(member => ({
    name: cleanText(member?.name, 48) || "RYVEX PLAYER",
    role: cleanText(member?.role, 32) || "PLAYER",
    position: cleanText(member?.position || member?.pos, 24) || "—",
    online: Boolean(member?.online || member?.voice),
    avatar: httpsUrl(member?.avatar, ["cdn.discordapp.com", "media.discordapp.net"])
  })) : [];

  const events = Array.isArray(body?.events) ? body.events.slice(0, 30).map(event => ({
    title: cleanText(event?.title, 100),
    kind: cleanText(event?.kind, 48),
    competition: cleanText(event?.competition, 64) || null,
    startsAt: Number(event?.startsAt || 0) || 0,
    result: event?.result ? cleanText(typeof event.result === "string" ? event.result : event.result?.score, 32) : null
  })) : [];

  const results = Array.isArray(body?.results) ? body.results.slice(0, 12).map(result => ({
    opponent: cleanText(result?.opponent, 60) || "OPPONENT",
    competition: cleanText(result?.competition, 64) || "MATCH",
    startsAt: Number(result?.startsAt || 0) || 0,
    score: cleanText(result?.score, 20) || "—",
    outcome: ["W", "L", "D"].includes(String(result?.outcome)) ? String(result.outcome) : null
  })) : [];

  const reportedMembers = Number(body?.summary?.members);
  const reportedOnline = Number(body?.summary?.online);
  const reportedWins = Number(body?.summary?.wins);

  return {
    ok: true,
    generatedAt: Number(body?.generatedAt || Date.now()),
    club: {
      name: cleanText(body?.club?.name, 60) || "RYVEX Esports",
      since: cleanText(body?.club?.since, 10) || "2026",
      logo: httpsUrl(body?.club?.logo, ["cdn.discordapp.com", "media.discordapp.net"])
    },
    summary: {
      members: Number.isFinite(reportedMembers) ? reportedMembers : members.length,
      online: Number.isFinite(reportedOnline) ? reportedOnline : members.filter(m => m.online).length,
      wins: Number.isFinite(reportedWins) ? reportedWins : results.filter(r => r.outcome === "W").length,
      form: cleanText(body?.summary?.form, 20) || (results.slice(0, 5).map(r => r.outcome).filter(Boolean).join("-") || "—")
    },
    members,
    events,
    results
  };
}

export function sanitizePublicState(body) {
  const full = sanitizeMemberState(body);
  const matchLike = full.events.filter(event => /match|zápas|zapas|league|liga|turnaj|tournament|pcg|vpg|prestige/i.test(`${event.title} ${event.kind} ${event.competition || ""}`));
  return {
    ok: true,
    generatedAt: full.generatedAt,
    club: full.club,
    summary: full.summary,
    events: matchLike.slice(0, 4),
    results: full.results.slice(0, 4)
  };
}

export async function fetchBotState(env, viewerId) {
  const base = String(env.RYVEX_BOT_API_URL || "").replace(/\/$/, "");
  const key = String(env.RYVEX_BOT_API_KEY || "");
  const viewer = String(viewerId || "");
  if (!/^https:\/\//i.test(base) || !key || !/^\d{15,25}$/.test(viewer)) {
    return { ok: false, status: 503, error: "live_bridge_not_configured" };
  }

  try {
    const response = await fetch(`${base}/api/v1/state`, {
      headers: {
        "Accept": "application/json",
        "X-RYVEX-API-KEY": key,
        "X-RYVEX-USER-ID": viewer
      },
      cf: { cacheTtl: 5, cacheEverything: false }
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) {
      return { ok: false, status: 502, error: body?.error || "bridge_error", bridgeStatus: response.status };
    }
    return { ok: true, body };
  } catch {
    return { ok: false, status: 502, error: "bridge_unreachable" };
  }
}
