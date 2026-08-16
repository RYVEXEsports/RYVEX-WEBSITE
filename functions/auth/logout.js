import { clearSessionCookie } from "../_lib/session.js";

export async function onRequestGet() {
  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/#members",
      "Set-Cookie": clearSessionCookie(),
      "Cache-Control": "no-store"
    }
  });
}
