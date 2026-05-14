# GetChecked — getchecked.co

> Coat check done right. New York City.

## What this is

GetChecked is a lightweight luggage-storage platform that connects consumers with
vetted neighborhood businesses (stations). No native app. No payment processing.
Just a QR code, a digital stub, and a swipe.

---

## Stack

| Layer         | Tool                            | Cost at pilot |
|---------------|---------------------------------|---------------|
| Hosting       | Netlify (static CDN)            | Free          |
| Source        | GitHub                          | Free          |
| Serverless    | Netlify Functions               | Free tier     |
| Database      | Supabase (Postgres)             | Free tier     |
| Email         | Resend                          | Free tier     |
| QR generation | qrcode.js (client-side)         | Free          |
| Fonts         | Google Fonts (Barlow family)    | Free          |

---

## Project structure

```
getchecked/
├── public/                   ← Netlify publish root
│   ├── index.html            ← Consumer landing (getchecked.co)
│   ├── s/
│   │   └── index.html        ← Station page (/s/001, /s/002, ...)
│   ├── dashboard/
│   │   └── index.html        ← Business dashboard (/dashboard/001)
│   ├── nyc/
│   │   └── index.html        ← Regional map + station finder
│   └── partner/
│       └── index.html        ← How to become a station
├── src/
│   ├── lib/
│   │   └── gc.js             ← Shared station data, utils, components
│   └── styles/
│       └── global.css        ← Design tokens + shared styles
├── netlify/
│   └── functions/
│       ├── create-reservation.js
│       ├── confirm-checkin.js
│       └── release-item.js
└── netlify.toml              ← Redirects + headers config
```

---

## How QR codes work

Every station QR code is just a URL:

```
Station 001  →  https://getchecked.co/s/001
Station 002  →  https://getchecked.co/s/002
```

Generate QR codes for print using any free QR generator pointed at those URLs.
Recommended: https://qr.io or use the qrcode.js library already in the codebase.

The physical sticker goes in the shop window or on the counter.
When a consumer scans it, they land on the mobile station page and can check in instantly.

---

## Station dashboard access

Each station owner bookmarks:
```
https://getchecked.co/dashboard/001
```

Protected by a 4-digit PIN set during onboarding.
**Demo PIN for all stations: 0001**

The dashboard shows:
- Active checked items + claim codes
- Confirm drop-off (enter claim code or scan QR)
- Release item (swipe button)
- Today's stats

---

## Deploy to Netlify

1. Push this repo to GitHub
2. Log into Netlify → New site from Git → connect your repo
3. Build settings:
   - Build command: *(leave blank — static site)*
   - Publish directory: `public`
4. Deploy

Domain: connect `getchecked.co` in Netlify → Domain management.

---

## Adding a new station

Edit `src/lib/gc.js` — add an entry to the `STATIONS` object:

```js
"006": {
  id: "006",
  name: "Your Business Name",
  neighborhood: "Lower East Side",
  address: "123 Your St, New York, NY 10002",
  lat: 40.7200,
  lng: -73.9880,
  fee: "$5",
  feeMin: 5,
  feeMax: 5,
  payment: ["cash", "venmo"],
  hours: "Mon–Sat 9AM–7PM",
  capacity: 6,
  cause: "Name of local cause",
  active: true,
},
```

Commit and push → Netlify auto-deploys in ~30 seconds.
Print a QR sticker for `https://getchecked.co/s/006`. Done.

---

## When to add Supabase

The `netlify/functions/` files have `// TODO: Supabase` comments at every DB write point.
Connect Supabase when you need:
- Reservations that survive a browser refresh
- Multi-device sync (consumer books on phone, owner sees on their phone)
- Analytics across stations

Until then, the pilot runs entirely on `localStorage` — fine for testing and demo.

---

## The 5% Stub

Each station self-reports 5% of storage revenue to a named neighborhood cause.
This is displayed on their station page. GetChecked never handles money.

---

## Insurance

GetChecked provides item protection insurance covering consumer belongings during storage.
This is listed on the claim stub and station page. Business liability is separate.

---

## License model

GetChecked charges stations a flat annual license fee (TBD post-pilot).
Pilot stations are free. GetChecked never takes a revenue percentage.
Stations set their own price and collect payment directly.
