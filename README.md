# RYVEX Esports Website 1.0

Statická verze oficiálního webu RYVEX Esports připravená pro bezplatný hosting.

## Obsah
- Home / hero
- Match Center
- Roster
- Stats
- Stream Center
- RYVEX App
- Recruitment
- Responsive mobilní menu
- Animace při scrollování

## Co upravit před ostrým spuštěním
1. `script.js` – doplnit skutečnou soupisku.
2. `index.html` – doplnit soupeře, termín dalšího zápasu, YouTube a RYVEX App odkazy.
3. `index.html` – změnit dočasný e-mail `ryvex@example.com`.
4. Později napojit data na RYVEX Manager / API.

## Cloudflare Pages zdarma
1. Nahraj celý obsah této složky do GitHub repozitáře.
2. V Cloudflare otevři Workers & Pages → Create application → Pages → Connect to Git.
3. Vyber repozitář.
4. Framework preset: None.
5. Build command: nechat prázdný.
6. Build output directory: `/`
7. Deploy.

Potom lze připojit vlastní doménu `ryvexesports.cz`.
