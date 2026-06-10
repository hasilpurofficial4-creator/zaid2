# ZAID BWP STOCK MANAGER - Implementation Plan

## Context
Build a full-stack PWA for stock/inventory management with a public dashboard (`index.html`) and password-protected admin panel (`admin.html`). Data is persisted as JSON files in a GitHub repo via Vercel serverless functions. Push notifications alert the dashboard on every new admin entry.

## File Structure
```
/
├── index.html                    # Public dashboard (read-only + notifications)
├── admin.html                    # Password-protected admin CRUD
├── css/
│   ├── style.css                 # Shared design system (light theme, Inter font, CSS vars)
│   ├── dashboard.css             # Dashboard-specific styles
│   └── admin.css                 # Admin forms and layout
├── js/
│   ├── shared/
│   │   ├── api.js                # Centralized fetch wrapper
│   │   ├── utils.js              # ID gen, date format, currency (PKR), sorting
│   │   ├── modal.js              # Detail/edit/delete modal
│   │   ├── auth.js               # Password gate + JWT token management
│   │   └── notifications.js      # Push subscription flow
│   ├── pages/
│   │   ├── dashboard.js          # index.html entry point
│   │   └── admin.js              # admin.html entry point
│   └── sections/
│       ├── items.js, wallet.js, person.js, maintenance.js, samples.js, clipping.js
├── sw.js                         # Service Worker (cache + push handler)
├── manifest.json                 # PWA manifest
├── icons/                        # PWA icons (generated)
├── api/
│   ├── _github.js                # GitHub API read/write helper
│   ├── _auth-middleware.js       # JWT verification
│   ├── auth.js                   # Password -> token exchange
│   ├── subscribe.js              # Save push subscriptions
│   ├── notify.js                 # Send push notifications (internal)
│   └── data/
│       ├── items.js, wallet.js, person.js, maintenance.js, samples.js, clipping.js
├── data/                         # Seed JSON files (empty arrays)
├── vercel.json                   # Routing + function config
└── package.json                  # deps: web-push, jsonwebtoken
```

## Environment Variables (Vercel)
| Variable | Purpose |
|---|---|
| `GITHUB_TOKEN` | PAT with repo scope |
| `GITHUB_REPO` | `owner/repo` for data storage |
| `GITHUB_BRANCH` | Default `main` |
| `ADMIN_PASSWORD` | Admin page password |
| `JWT_SECRET` | Session token signing secret |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_EMAIL` | Web Push keys |

## Architecture

### Serverless API Pattern
- Each section has a CRUD endpoint at `/api/data/[section]`
- **GET** returns data (no auth needed), **POST/PUT/DELETE** require JWT
- Data stored via GitHub Contents API (read base64 -> mutate -> write back with SHA)
- After mutations, trigger push notifications to all subscribers

### Auth Flow
- Admin page shows password prompt -> calls `POST /api/auth` -> receives JWT -> stored in `sessionStorage`
- All mutations send `Authorization: Bearer <token>`

### Notification Flow
- Dashboard requests Notification permission -> subscribes via Push API -> sends subscription to `/api/subscribe`
- On admin entry write -> serverless function calls `web-push` to all subscribers -> service worker shows notification

### Real-time Updates
- Dashboard polls all 6 endpoints every 30 seconds
- Push notifications provide instant alerts

## 6 Admin Sections

1. **Items** (`data/items.json`): Name, serial#, person, model, qty, status, auto-timestamp
2. **Wallet** (`data/wallet.json`): Money In (green, person+amount) / Money Out (red, purpose+amount), PKR display, running balance
3. **Person** (`data/person.json`): Nadeem & Zeeshan attendance, enter/exit buttons, monthly hours, absent tracking
4. **Maintenance** (`data/maintenance.json`): Categories (Complaint/Issue/Service/Urgent), subject+description, mark solved, counts
5. **Samples** (`data/samples.json`): In (green, right) / Out (red, left), person name, pieces, timestamp
6. **Clipping** (`data/clipping.json`): In (green, right) / Out (red, left), clipper name, size, timestamp

**Common:** Delete + Edit buttons on every entry, click for detail modal, sorted by latest first.

## Design System
- Light theme with CSS custom properties
- Google Font: Inter (400/500/600/700)
- Inline SVG icons (no emojis)
- Responsive grid layout (1-3 columns)
- Green for positive/enter/in, Red for negative/exit/out
- Cards with rounded corners, subtle shadows

## Implementation Order

| Task | Description |
|---|---|
| **Task 1** | Create project foundation: `package.json`, `vercel.json`, `manifest.json`, seed `data/*.json` files |
| **Task 2** | Build serverless infrastructure: `_github.js`, `_auth-middleware.js`, `auth.js` |
| **Task 3** | Build all 6 section API endpoints (`api/data/*.js`) + `subscribe.js` + `notify.js` |
| **Task 4** | Create shared CSS design system (`style.css`) + page-specific CSS |
| **Task 5** | Build shared JS modules: `api.js`, `utils.js`, `modal.js`, `auth.js`, `notifications.js` |
| **Task 6** | Build HTML pages: `index.html` and `admin.html` |
| **Task 7** | Build all 6 section UI modules (`js/sections/*.js`) |
| **Task 8** | Build page entry points: `dashboard.js` and `admin.js` |
| **Task 9** | PWA: `sw.js`, icons, install prompt |
| **Task 10** | Polish: footer, responsive fixes, error handling, loading states |

## Verification
1. `npm install` succeeds
2. `vercel dev` starts local dev server
3. Admin page prompts password, accepts correct password
4. CRUD operations in each section work (create, read, update, delete)
5. Dashboard shows all 6 sections with live data
6. Adding entry in admin triggers notification on dashboard
7. PWA installable via browser prompt
8. Mobile responsive at 375px width
