# RYVEX Website 2.3.0 — Unified Realtime Club OS

- Manager LIVE CORE v3 je jediný zdroj klubových dat a oprávnění.
- SSE `/api/stream` okamžitě přenáší změny z Manageru; 30s polling zůstává jako fallback.
- Management zrcadlí Voting Planner, Automation Center, Player Score Lineup a Matchday/EA Sync.
- Discord OAuth = identita; Manager `/api/v1/access` = členství, role a permissions.
- RYVEX_BOT_API_KEY zůstává pouze server-side v Cloudflare Functions.
