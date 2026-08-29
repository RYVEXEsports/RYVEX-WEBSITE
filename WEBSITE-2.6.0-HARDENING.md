# RYVEX Website 2.6.0 — hardening

Cloudflare Pages ENV: `RYVEX_BOT_API_URL`, `RYVEX_WEBSITE_API_KEY` (nebo fallback `RYVEX_BOT_API_KEY`) a stávající Discord/session proměnné.

Browser `confirm()`/`alert()` byly odstraněny z management UI a nahrazeny RYVEX modal/toast vrstvou. Oprávnění jsou kontrolována po konkrétních capabilities, ne širokým management aliasem.
