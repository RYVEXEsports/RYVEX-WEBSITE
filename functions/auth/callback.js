import { clearStateCookie, parseCookies, sessionCookie, signSession } from "../_lib/session.js";
import { checkManagerClubAccess, oauthRoleGate } from "../_lib/access.js";

function redirect(location, extraCookies = []) {
  const headers = new Headers({ "Location": location, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  extraCookies.forEach(cookie => headers.append("Set-Cookie", cookie));
  return new Response(null, { status: 302, headers });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const cookies = parseCookies(request);

  if (!code || !state || !cookies.ryvex_oauth_state || state !== cookies.ryvex_oauth_state) {
    return redirect("/?auth=invalid_state#members", [clearStateCookie()]);
  }

  const mode = state.startsWith("visitor.") ? "visitor" : "club";
  const clientId = String(env.DISCORD_CLIENT_ID || "").trim();
  const clientSecret = String(env.DISCORD_CLIENT_SECRET || "").trim();
  const redirectUri = String(env.DISCORD_REDIRECT_URI || "").trim();
  const guildId = String(env.RYVEX_GUILD_ID || "").trim();
  const sessionSecret = String(env.RYVEX_WEBSITE_SESSION_SECRET || "").trim();

  if (!clientId || !clientSecret || !redirectUri || !/^\d{15,25}$/.test(guildId) || sessionSecret.length < 32) {
    return redirect("/?auth=not_configured#members", [clearStateCookie()]);
  }

  try {
    const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      })
    });
    const token = await tokenResponse.json().catch(() => null);
    if (!tokenResponse.ok || !token?.access_token) throw new Error("token_exchange_failed");

    const authHeaders = { "Authorization": `Bearer ${token.access_token}`, "Accept": "application/json" };
    const [userResponse, memberResponse] = await Promise.all([
      fetch("https://discord.com/api/v10/users/@me", { headers: authHeaders }),
      fetch(`https://discord.com/api/v10/users/@me/guilds/${encodeURIComponent(guildId)}/member`, { headers: authHeaders })
    ]);

    const user = await userResponse.json().catch(() => null);
    const member = await memberResponse.json().catch(() => null);
    if (!userResponse.ok || !user?.id) throw new Error("discord_user_failed");

    if (mode === "club") {
      if (!memberResponse.ok) return redirect("/?auth=not_member#members", [clearStateCookie()]);
      const roleGate = oauthRoleGate(env, member);
      if (roleGate.configured && !roleGate.allowed) {
        return redirect("/?auth=not_active_member#members", [clearStateCookie()]);
      }
      const managerAccess = await checkManagerClubAccess(env, String(user.id));
      if (!managerAccess.active) {
        return redirect(`/?auth=${Number(managerAccess.status || 0) >= 500 ? 'membership_check_failed' : 'not_active_member'}#members`, [clearStateCookie()]);
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const tokenValue = await signSession({
      sub: String(user.id),
      username: String(user.username || "RYVEX user").slice(0, 40),
      globalName: String(user.global_name || user.username || "RYVEX user").slice(0, 60),
      avatar: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : null,
      guild: memberResponse.ok ? guildId : null,
      guildRoles: memberResponse.ok && Array.isArray(member?.roles) ? member.roles.map(String).slice(0, 80) : [],
      accessType: mode,
      iat: now,
      exp: now + 60 * 60 * (mode === "club" ? 24 : 24 * 7)
    }, sessionSecret);

    return redirect(mode === "club" ? "/members.html" : "/visitor.html", [sessionCookie(tokenValue, mode === "club" ? 60 * 60 * 24 : 60 * 60 * 24 * 7), clearStateCookie()]);
  } catch {
    return redirect(`/?auth=discord_error#members`, [clearStateCookie()]);
  }
}
