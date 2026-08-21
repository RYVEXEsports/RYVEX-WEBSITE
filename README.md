# RYVEX Esports Website 2.0.2 — PREMIUM SHARP + ACCESS CONTROL

Kompletní webová vrstva RYVEX Esports napojená na stejný RYVEX Manager / Discord zdroj dat jako klubová aplikace.

## Co je nové

### Public web
- LIVE aktivní soupiska z Discordu / RYVEX Manageru (bez ručního přepisování hráčů)
- LIVE Match Center, výsledky, členové, online stav a forma
- YouTube LIVE @AinslayCZ
- přejmenovaná Member Zone na **RYVEX Club OS**
- veřejná data se obnovují automaticky

### RYVEX Club OS (po Discord loginu)
- Přehled klubu + sync status
- Hlasování včetně hlasování ANO / MOŽNÁ / NE přímo z webu
- Historie hlasování
- Klubový kalendář
- Lineup / sestava + náhradníci
- Statistiky + EA leaderboard fallback
- Žebříčky střelců, asistencí, MVP a ratingu
- Aktivita hráčů
- Docházka
- Matchday + výsledky
- Pozice hráčů + editace vlastní dvojice pozic při Manager 5.0.3+
- Kompletní aktivní roster
- Discord Chat: kanály, historie, odesílání zpráv
- Discord Voice: místnosti, členové, odkaz na připojení
- RYVEX Radio
- YouTube Stream Center
- Soukromá podpora / ticket při Manager 5.0.3+
- Owner Management: vytvoření hlasování a klubového oznámení přímo z webu

## Automatická synchronizace
- `/api/member-state` obnovuje Club OS každých 15 s.
- Chat se v otevřené sekci obnovuje každých 10 s.
- Voice se v otevřené sekci obnovuje každých 15 s.
- Public web používá `/api/site-live`.
- YouTube LIVE kontrola zůstává přes `/api/youtube-live`.
- Discord + RYVEX Manager + EA FC data zůstávají source of truth.
- Web neobsahuje `RYVEX_BOT_API_KEY` ani Discord Client Secret ve frontendu.

## Manager kompatibilita

### RYVEX Manager 5.0.2 LIVE rollback
Web funguje v compatibility režimu:
- LIVE roster, summary, poll, calendar/events, results, lineup, EA leaderboard, radio, stream, chat, voice a Owner create poll / announcement fungují.
- Detailní `statistics/activity/attendance/positions/matches/support` nejsou v API 5.0.2 publikované. Web pro statistiky použije EA leaderboard fallback a u ostatních modulů zobrazí bezpečný fallback.

### RYVEX Manager 5.0.3 Club OS LIVE Sync+
Plný režim:
- native statistics, goalkeepers, rankings, MVP
- activity
- attendance
- positions + `/api/v1/position`
- match details
- support + `/api/v1/support`

## Cloudflare Pages — proměnné
Stávající:
- `RYVEX_BOT_API_URL` — Text
- `RYVEX_BOT_API_KEY` — Secret
- `RYVEX_PUBLIC_VIEW_USER_ID` — Text
- `YOUTUBE_API_KEY` — Secret

Discord Member / Club OS:
- `DISCORD_CLIENT_ID` — Text
- `DISCORD_CLIENT_SECRET` — Secret
- `RYVEX_GUILD_ID` — Text
- `DISCORD_REDIRECT_URI` — Text, např. `https://TVUJ-WEB.pages.dev/auth/callback`
- `RYVEX_WEBSITE_SESSION_SECRET` — Secret, min. 32 náhodných znaků

## Discord Developer Portal
V OAuth2 > Redirects musí být přesně stejná URL jako `DISCORD_REDIRECT_URI`.
Scope používá pouze:
- `identify`
- `guilds.members.read`

## Nasazení
Tento ZIP je **FULL GIT / FULL WEBSITE** balík.
Nahraj jeho obsah do kořene webového GitHub repa a nahraď existující soubory. Cloudflare Pages poté deployne statické soubory i `/functions` automaticky.

## Bezpečnost
- Club OS vyžaduje podepsanou `HttpOnly + Secure + SameSite=Lax` session.
- Každý privátní API endpoint znovu ověřuje session a guild ID.
- Manager API key je pouze v Cloudflare Functions.
- Owner akce znovu autorizuje samotný RYVEX Manager.
- Chat respektuje Discord View/Read/Send permissions.
- Voice respektuje Discord View/Connect permissions.
- CSP blokuje cizí skripty; externí audio je povolené jen jako HTTPS media.


## 2.0.2 — Club member / Fan access
- Samostatný Discord login pro aktivní členy: `/auth/login?mode=club`.
- Samostatný omezený Fan login: `/auth/login?mode=visitor`.
- Club access se před privátním API voláním znovu ověřuje proti RYVEX Manageru.
- Fan Zone: `visitor.html`, merch interest a recruitment application.
- Management UI se řídí `permissions` z Manageru; Owner má plný přístup, Admin Team pouze povolené capability.
- Detail Manager kontraktu: `MANAGER-INTEGRATION-2.0.2.md`.

### Nové / změněné Cloudflare proměnné
- `DISCORD_REDIRECT_URI` = `https://ryvexesports.eu/auth/callback` (doporučená produkční hodnota).
- `RYVEX_MEMBER_ROLE_IDS` — volitelný Text; čárkou oddělené Discord role ID jako dodatečný club login gate.
- `RYVEX_PUBLIC_REQUEST_WEBHOOK_URL` — volitelný Secret; pouze fallback, když Manager zatím nemá `/api/v1/public-request`.

Po změně `DISCORD_REDIRECT_URI` musí být **stejná URL** přidaná v Discord Developer Portal > OAuth2 > Redirects.
