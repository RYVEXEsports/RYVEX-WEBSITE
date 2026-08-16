const baseHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY"
};

function json(payload, status = 200, cache = "public, max-age=10, s-maxage=15, stale-while-revalidate=30") {
  return new Response(JSON.stringify(payload), { status, headers: { ...baseHeaders, "Cache-Control": cache } });
}

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

function sanitizeState(body) {
  const members = Array.isArray(body?.members) ? body.members.slice(0, 32).map(member => ({
    name: cleanText(member?.name, 48) || "RYVEX PLAYER",
    role: cleanText(member?.role, 32) || "PLAYER",
    position: cleanText(member?.position || member?.pos, 24) || "—",
    online: Boolean(member?.online || member?.voice),
    avatar: httpsUrl(member?.avatar, ["cdn.discordapp.com", "media.discordapp.net"])
  })) : [];

  const events = Array.isArray(body?.events) ? body.events.slice(0, 20).map(event => ({
    title: cleanText(event?.title, 100),
    kind: cleanText(event?.kind, 48),
    competition: cleanText(event?.competition, 64) || null,
    startsAt: Number(event?.startsAt || 0) || 0,
    result: event?.result ? cleanText(typeof event.result === "string" ? event.result : event.result?.score, 32) : null
  })) : [];

  const results = Array.isArray(body?.results) ? body.results.slice(0, 8).map(result => ({
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

export async function onRequestGet({ env }) {
  const base = String(env.RYVEX_BOT_API_URL || "").replace(/\/$/, "");
  const key = String(env.RYVEX_BOT_API_KEY || "");
  const viewer = String(env.RYVEX_PUBLIC_VIEW_USER_ID || "");

  if (!/^https:\/\//i.test(base) || !key || !/^\d{15,25}$/.test(viewer)) {
    return json({ ok: false, error: "live_bridge_not_configured" }, 503, "no-store");
  }

  try {
    const response = await fetch(`${base}/api/v1/state`, {
      headers: {
        "Accept": "application/json",
        "X-RYVEX-API-KEY": key,
        "X-RYVEX-USER-ID": viewer
      },
      cf: { cacheTtl: 10, cacheEverything: false }
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.ok) {
      return json({ ok: false, error: body?.error || "bridge_error", bridgeStatus: response.status }, 502, "no-store");
    }
    return json(sanitizeState(body));
  } catch {
    return json({ ok: false, error: "bridge_unreachable" }, 502, "no-store");
  }
}
