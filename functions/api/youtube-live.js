const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=30, s-maxage=45, stale-while-revalidate=60",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY"
};
function json(payload, status = 200) { return new Response(JSON.stringify(payload), { status, headers }); }

export async function onRequestGet({ env }) {
  const key = String(env.YOUTUBE_API_KEY || "").trim();
  if (!key) return json({ ok: false, error: "youtube_api_not_configured", online: false }, 503);
  try {
    const handle = "@AinslayCZ";
    const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${encodeURIComponent(handle)}&key=${encodeURIComponent(key)}`);
    const channelBody = await channelResponse.json();
    const channel = channelBody?.items?.[0];
    if (!channelResponse.ok || !channel?.id) return json({ ok: false, error: "youtube_channel_not_found", online: false }, 502);

    const liveResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(channel.id)}&eventType=live&type=video&maxResults=1&key=${encodeURIComponent(key)}`);
    const liveBody = await liveResponse.json();
    if (!liveResponse.ok) return json({ ok: false, error: "youtube_live_lookup_failed", online: false }, 502);
    const item = liveBody?.items?.[0];
    if (!item?.id?.videoId) return json({ ok: true, online: false, channelTitle: channel.snippet?.title || "AinslayCZ" });
    return json({
      ok: true,
      online: true,
      videoId: String(item.id.videoId).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 20),
      title: String(item.snippet?.title || "AinslayCZ LIVE").slice(0, 160)
    });
  } catch {
    return json({ ok: false, error: "youtube_unreachable", online: false }, 502);
  }
}
