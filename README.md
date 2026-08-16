# RYVEX Esports Website 1.5 — LIVE + SECURITY

Base: RYVEX-ESPORTS-WEBSITE-1.4.zip

## Hotovo
- layout roztažený až téměř do krajů (max 1560 px)
- PRESTIGE LEAGUE opraveno
- náborový headline: Ready to wear RYVEX Esports?
- RYVEX App preview předělaný do stylu skutečné aplikace
- Open RYVEX App vede na https://ryvex-app.pages.dev
- YouTube LIVE automaticky sleduje @AinslayCZ a přehrává stream přímo na webu
- Discord / RYVEX Manager LIVE: roster, online stav, další event/zápas, poslední výsledky, wins a form
- frontend nikdy nedostane RYVEX_BOT_API_KEY
- Cloudflare Function vrací jen sanitizovaná veřejná data; hlasování, chat, owner actions a interní poll data se na web nevystavují
- security headers: CSP, HSTS, frame protection, permissions policy, nosniff, strict referrer
- dynamická data se zapisují do DOM přes textContent; live payload se nepouští do raw HTML

## Cloudflare Pages — Production variables / secrets
V projektu WEBU (ne jen v projektu aplikace) nastav:

- RYVEX_BOT_API_URL = veřejná HTTPS URL RYVEX Manager hostingu, bez lomítka na konci
- RYVEX_BOT_API_KEY = stejný secret jako RYVEX_WEB_API_KEY v hostingu bota — nastav jako Secret
- RYVEX_PUBLIC_VIEW_USER_ID = Discord ID účtu, který je v RYVEX jako Owner/Management/Player — doporučeno Owner; zůstává server-side
- YOUTUBE_API_KEY = YouTube Data API v3 key — nastav jako Secret

Website Function používá RYVEX_PUBLIC_VIEW_USER_ID jen server-side pro READ-ONLY načtení stavu z existujícího /api/v1/state. Do browseru pošle pouze veřejné/sanitizované informace.

## Deploy
Nahraj obsah této složky jako root web projektu. Cloudflare Pages musí zachovat složku `functions/`, `_routes.json` a `_headers`.

Po deployi ověř:
1. `/api/site-live` vrací `ok: true`
2. `/api/youtube-live` vrací `ok: true` (online true/false podle streamu)
3. Team / Matches / Stats se po načtení přepnou na LIVE data
4. tlačítko Open RYVEX App otevírá https://ryvex-app.pages.dev

## Poznámka k bezpečnosti
Web je záměrně read-only. Nepřidává žádné veřejné endpointy pro hlasování, chat, owner management ani zápis na Discord. Interní ovládání zůstává v zabezpečené RYVEX App.
