import { randomState, stateCookie } from "../_lib/session.js";

export async function onRequestGet({ env }) {
  const clientId = String(env.DISCORD_CLIENT_ID || "").trim();
  const redirectUri = String(env.DISCORD_REDIRECT_URI || "").trim();
  if (!/^\d{15,25}$/.test(clientId) || !/^https:\/\//i.test(redirectUri)) {
    return new Response("Discord login is not configured.", { status: 503 });
  }

  const state = randomState();
  const authorize = new URL("https://discord.com/oauth2/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("scope", "identify guilds.members.read");
  authorize.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      "Location": authorize.toString(),
      "Set-Cookie": stateCookie(state),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
