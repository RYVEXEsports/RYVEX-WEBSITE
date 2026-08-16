import { fetchBotState, sanitizePublicState } from "../_lib/bridge.js";

const baseHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY"
};

function json(payload, status = 200, cache = "public, max-age=10, s-maxage=15, stale-while-revalidate=30") {
  return new Response(JSON.stringify(payload), { status, headers: { ...baseHeaders, "Cache-Control": cache } });
}

export async function onRequestGet({ env }) {
  const serviceViewer = String(env.RYVEX_PUBLIC_VIEW_USER_ID || "");
  const state = await fetchBotState(env, serviceViewer);
  if (!state.ok) return json({ ok: false, error: state.error, bridgeStatus: state.bridgeStatus }, state.status, "no-store");
  return json(sanitizePublicState(state.body));
}
