# Dhanlaxmi Business Hub

Website + Chrome extension: Dhanlaxmi Product Wise Business table se `total_business` / `turnover` calculate → tumhari website pe multi-account dashboard.

> Plan: [`WEB_EXT_PROJECT_PLAN.md`](./WEB_EXT_PROJECT_PLAN.md)  
> Purana `xlnc` sirf rules/logic reference — is repo me implement.

## Monorepo layout

```
apps/web/           # Next.js (App Router) — website + API
apps/extension/     # Chrome Manifest V3
packages/rules/     # calculateBusiness (Phase 1: xlnc port)
packages/shared/    # API types + constants
```

## Phase 0 decisions (fixed for v1)

| Topic | Choice |
|-------|--------|
| Auth | Custom email + password + JWT (Phase 2) |
| Captures | Upsert same `(user, dl_account_id, start, end)` |
| Extension distribute | Manual Load unpacked / `.zip` pehle |
| Hosting | TBD (local abhi; baad me Vercel + Postgres) |
| DB | Phase 2 me SQLite MVP → Postgres production |

## Prerequisites

- Node.js **≥ 20**
- Chrome (extension load ke liye)

## Setup

```bash
npm install
npm run build:rules
npm run build:shared
npm run build:extension
```

## Local run

### Website

```bash
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000).

### Extension (Chrome)

1. `npm run build:extension`
2. Chrome → `chrome://extensions` → **Developer mode** ON
3. **Load unpacked** → select `apps/extension/dist`
4. Dhanlaxmi tab pe content script tabhi chalega jab host match ho

Watch rebuild (optional):

```bash
# Windows PowerShell: rebuild after edits, then Reload extension
npm run build:extension
```

## Workspace scripts

| Script | Kaam |
|--------|------|
| `npm run dev:web` | Next.js dev server |
| `npm run build:web` | Next.js production build |
| `npm run build:extension` | Extension → `apps/extension/dist` |
| `npm run build:rules` | Compile `@dlbh/rules` |
| `npm run build:shared` | Compile `@dlbh/shared` |
| `npm run test:rules` | Rules unit tests (Phase 1) |

## Phases

- [x] **Phase 0** — monorepo scaffold  
- [x] **Phase 1** — `@dlbh/rules` (`calculateBusiness` + tests)  
- [x] **Phase 2** — auth + `/api/captures` + dashboard (SQLite)  
- [x] **Phase 3** — extension extract → calculate → save  
- [x] **Phase 4** — polish, privacy/about/install, zip  

### Extension

```bash
npm run build:extension          # Load unpacked → apps/extension/dist
npm run zip:extension            # → apps/extension/dhanlaxmi-business-hub-extension.zip
```

1. `npm run dev:web`  
2. Popup me website login  
3. Dhanlaxmi → Product Wise Business → Search  
4. **Calculate & Save**  

Pages: `/install` · `/privacy` · `/about` · `/dashboard` · `/accounts/[id]`  

### v1 acceptance

- [x] Dashboard bina login nahi  
- [x] Extension logged-out Save block  
- [x] Rules se `total_business` / `turnover`  
- [x] Account id/name (DOM ya manual)  
- [x] Multi-account dashboard + filter  
- [x] Capture payload me password reject  
- [x] Disclaimer landing + popup  


### Phase 2 local check

1. `apps/web/.env.local` me `JWT_SECRET` set (`.env.example` dekho)  
2. `npm run dev:web` → [http://localhost:3000](http://localhost:3000)  
3. Register → Dashboard → **Add sample capture** (upsert same account+dates)  


Rules docs: [`packages/rules/RULES.md`](./packages/rules/RULES.md)  


## Disclaimer

Not affiliated with Dhanlaxmi. Tool sirf user-visible table se read-only calculate karta hai. Dhanlaxmi passwords is product pe store nahi hote.
