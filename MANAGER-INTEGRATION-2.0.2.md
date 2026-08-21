# RYVEX Website 2.0.2 ↔ Manager integration

Website 2.0.2 je připravený na role-based přístup a veřejné žádosti. Stávající Manager `/api/v1/state` zůstává fallback source of truth pro aktivní členství.

## 1. GET `/api/v1/access` — doporučené
Website posílá:
- `X-RYVEX-API-KEY`
- `X-RYVEX-USER-ID`

Doporučená odpověď:

```json
{
  "ok": true,
  "access": {
    "activeMember": true,
    "level": "admin"
  },
  "currentUser": {
    "id": "DISCORD_USER_ID",
    "role": "ADMIN"
  },
  "permissions": {
    "isOwner": false,
    "canCreatePoll": true,
    "canCreateAnnouncement": true,
    "canManageWebsite": false
  }
}
```

Při odchodu / kicku:

```json
{
  "ok": true,
  "access": {
    "activeMember": false,
    "level": "inactive"
  },
  "permissions": {}
}
```

Website pak privátní API zablokuje.

## 2. Role mapping
Discord / Manager je jediný source of truth. Website práva sama nevytváří.

Rozpoznané permission keys pro Management UI:
- Owner: `permissions.isOwner`
- Hlasování: `canCreatePoll`, `createPoll`, `managePolls`, `polls`, `canManagePolls`
- Oznámení: `canCreateAnnouncement`, `createAnnouncement`, `manageAnnouncements`, `announcements`, `canManageAnnouncements`
- Globální management: `canManageClub`, `manageClub`, `canManage`, `management`
- Web edit capability je vhodné držet samostatně jako `canManageWebsite` / `manageWebsite` pro budoucí editor obsahu.

Manager musí stejné oprávnění ověřit i server-side u `/api/v1/manage`.

## 3. POST `/api/v1/public-request`
Používá se pro Fan Zone.

Website posílá:

```json
{
  "type": "recruitment",
  "requester": {
    "id": "DISCORD_USER_ID",
    "name": "Discord name",
    "avatar": "https://...",
    "accessType": "visitor"
  },
  "data": {
    "primaryPosition": "SO",
    "secondaryPosition": "HU",
    "platform": "PlayStation",
    "availability": "Po-Čt 19:30+",
    "experience": "...",
    "message": "..."
  },
  "source": "ryvex-website",
  "createdAt": 1787320000000
}
```

Nebo `type: "merch"` s:
- `item`
- `size`
- `note`

Doporučené chování Manageru:
- vytvořit interní request ID
- poslat embed do určeného Discord kanálu vedení
- pro recruitment vytvořit stav `NEW / REVIEW / CONTACTED / ACCEPTED / REJECTED`
- pro merch `NEW / CONTACTED / CLOSED`
- vrátit `{ "ok": true, "requestId": "..." }`

## 4. Bezpečnost
- Club OS nesmí autorizovat pouze podle frontendu.
- User ID z website je podepsaný HttpOnly session, ale Manager má stále ověřit API key + svůj Discord/source-of-truth stav.
- Odebraná role nebo ukončené členství musí znamenat `activeMember:false` nebo 403.
- Visitor request endpoint nesmí vracet interní klubová data.
