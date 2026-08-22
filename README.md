# RYVEX Esports Website 2.1.0 — MASTER

Kompletní černo-zlatá RYVEX Website vrstva se zachovaným designem a strukturou. Verze 2.1.0 slučuje Premium Sharp, Club OS access control, Fan Zone, role-based management a plný sync s RYVEX Managerem 5.1.0.

## Public web
- prémiově ostrý wide-screen layout bez přehnaného blur efektu
- LIVE roster, Match Center, výsledky, members, online stav a forma
- YouTube LIVE + RYVEX App sekce
- malé anonymní počitadlo unikátních návštěvníků
- počitadlo funguje přes Cloudflare KV, nebo automaticky přes RYVEX Manager 5.1.0 bez dalšího bindingu
- samostatný vstup **ČLEN KLUBU • CLUB OS**
- samostatný **Fan Login**

## RYVEX Club OS
- Discord OAuth + živé ověření členství přes RYVEX Manager
- kick / odchod / odebrání role = automatický lock při dalším ověření
- Přehled, Hlasování, Kalendář, Sestava, Statistiky, Aktivita, Docházka, Matchday, Pozice, Hráči, Chat, Voice, Radio & Stream, Podpora
- desktop sidebar + vlastní černo-zlaté mobilní menu
- role badge OWNER / Admin / Player podle Manageru

## Management podle rolí
- Owner: full access
- Club Admin: hlasování, oznámení, nábor/merch inbox podle Manager permissions
- Team Admin: hlasování + sportovní řízení podle Manager permissions
- Player/Trial: Club OS bez administračních akcí
- tvorba hlasování přímo z webu
- ruční ukončení aktuálního hlasování
- publikace klubového oznámení na Discord + soukromé Discord DM hráčům
- náborový a merch inbox s workflow: NOVÉ → ŘEŠÍ SE → SCHVÁLENO / ZAMÍTNUTO / UZAVŘENO
- všechna práva jsou znovu ověřena server-side v Manageru

## Fan Zone
- omezený veřejný přístup po Discord loginu
- veřejný Match Center
- merch interest formulář
- žádost o vstup do RYVEX
- Fan účet nikdy nezíská přístup k interním hlasováním, chatu, sestavám nebo Managementu

## Cloudflare Pages proměnné
Zachovat stávající hodnoty:
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DISCORD_REDIRECT_URI=https://ryvexesports.eu/auth/callback`
- `RYVEX_BOT_API_KEY`
- `RYVEX_BOT_API_URL`
- `RYVEX_GUILD_ID`
- `RYVEX_WEBSITE_SESSION_SECRET`
- `YOUTUBE_API_KEY`

Volitelné:
- `RYVEX_VISITORS` KV binding — pokud není, visitor counter použije Manager 5.1.0.

## Doporučená kombinace
Website 2.1.0 MASTER + RYVEX Manager 5.1.0 MASTER SYNC.
