# RYVEX Website 2.5.0 — Unified Secure Sync

- Manager 5.11 is authoritative for live data and RBAC.
- Feature Mirror exposes the Manager capability catalog as read-only data to active club members.
- Admin/Owner can access Player Watch and System & Security controls only when Manager grants the matching permission.
- Cloudflare `/api/ops` and `/api/manage` perform a second permission check before proxying to Manager.
- Optional `RYVEX_WEBSITE_API_KEY` isolates Website from App/Tournament credentials; legacy `RYVEX_BOT_API_KEY` remains fallback.
- Owner is never inferred from client JavaScript; the Manager Owner Lock remains authoritative.
