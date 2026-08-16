# RYVEX Esports Website 1.6 — Member Gate

Tato verze navazuje na 1.5.1 a přidává bezpečnou členskou zónu přímo na web.

## Co je nové
- Join RYVEX už neodkazuje do RYVEX App.
- Na hlavním webu je `Member Zone` s registrací/přihlášením přes Discord OAuth.
- Přístup dostane pouze Discord účet, který je aktuálním členem serveru RYVEX Esports.
- Po prvním úspěšném ověření se uživatel dostane na `/members.html`.
- Session je podepsaná HMAC, uložená pouze v `HttpOnly + Secure + SameSite=Lax` cookie.
- Soukromý endpoint `/api/member-state` bez platné session vrací 401.
- Veřejný `/api/site-live` už neposílá kompletní seznam členů ani interní hlasování/tréninky.
- Member Zone zobrazuje LIVE soupisku, eventy, výsledky a klubové statistiky.
- Připravené bloky pro další moduly: Hlasování, Lineup Studio, Club Center.

## Cloudflare — stávající proměnné
Tyto už web 1.5 používá a zůstávají beze změny:
- `RYVEX_BOT_API_URL` — Text
- `RYVEX_BOT_API_KEY` — Secret
- `RYVEX_PUBLIC_VIEW_USER_ID` — Text
- `YOUTUBE_API_KEY` — Secret

## Cloudflare — nové proměnné pro Member Zone
Přidej do Production:
- `DISCORD_CLIENT_ID` — Text — stejné Client ID jako používá RYVEX App
- `DISCORD_CLIENT_SECRET` — Secret — Discord OAuth client secret
- `RYVEX_GUILD_ID` — Text — ID Discord serveru RYVEX Esports
- `DISCORD_REDIRECT_URI` — Text — přesně `https://ryvex-website-5a5.pages.dev/auth/callback`
- `RYVEX_WEBSITE_SESSION_SECRET` — Secret — nový náhodný řetězec minimálně 32 znaků; nepoužívej veřejný nebo již zveřejněný secret

## Discord Developer Portal
V OAuth2 nastavení stejné Discord aplikace přidej mezi Redirects:
`https://ryvex-website-5a5.pages.dev/auth/callback`

Pokud později web dostane vlastní doménu, přidej i její callback a změň `DISCORD_REDIRECT_URI`.

## Důležitá bezpečnostní poznámka
Discord OAuth se používá pouze k identifikaci uživatele a ověření členství v konkrétním RYVEX serveru. Web nikdy nevidí ani neukládá Discord heslo.

Secrets, které byly někdy zobrazené na screenshotu nebo v otevřeném textu, doporučujeme rotovat před produkčním spuštěním Member Zone.
