const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64urlEncodeBytes(bytes) {
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlDecodeBytes(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(String(secret || "")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export function parseCookies(request) {
  const raw = request.headers.get("Cookie") || "";
  return Object.fromEntries(raw.split(";").map(part => part.trim()).filter(Boolean).map(part => {
    const idx = part.indexOf("=");
    return idx === -1 ? [part, ""] : [part.slice(0, idx), decodeURIComponent(part.slice(idx + 1))];
  }));
}

export async function signSession(payload, secret) {
  const body = base64urlEncodeBytes(encoder.encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(body)));
  return `${body}.${base64urlEncodeBytes(signature)}`;
}

export async function verifySession(token, secret) {
  try {
    const [body, sig] = String(token || "").split(".");
    if (!body || !sig || !secret) return null;
    const key = await importHmacKey(secret);
    const valid = await crypto.subtle.verify("HMAC", key, base64urlDecodeBytes(sig), encoder.encode(body));
    if (!valid) return null;
    const payload = JSON.parse(decoder.decode(base64urlDecodeBytes(body)));
    if (!payload?.sub || Number(payload?.exp || 0) <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookie(token, maxAge = 60 * 60 * 24 * 7) {
  return `ryvex_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return "ryvex_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

export function stateCookie(state, maxAge = 600) {
  return `ryvex_oauth_state=${encodeURIComponent(state)}; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearStateCookie() {
  return "ryvex_oauth_state=; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

export function randomState() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return base64urlEncodeBytes(bytes);
}
