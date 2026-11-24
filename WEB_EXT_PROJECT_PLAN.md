# Plan: Website + Chrome Extension (ALAG PROJECT)

> **Yahan (`xlnc`) implement mat karo.**  
> Yeh plan copy karke nayi folder / naya git repo me use karo.  
> Purana project (`D:\ai\projects\xlnc`) sirf rules/logic reference ke liye.

**Suggested new folder:** `D:\ai\projects\dhanlaxmi-web` (ya jo path tum choose karo)  
**Suggested repo name:** `dhanlaxmi-business-hub` (example)

---

## 1. Goal

User tumhari **website** pe login kare → Dhanlaxmi pe **khud** login + date + Search kare → **Chrome extension** se Calculate → result **server** pe save → website pe **multiple accounts** ka data dikhe.

### In scope
- Website auth (login compulsory)
- Chrome extension: table padho → rules se `total_business` + `turnover`
- Dhanlaxmi account name/id page se padh ke store
- Multi-account: har capture alag row (user alag-alag login karke dubara click)
- Dashboard: list / filter / totals
- Disclaimer: read-only calculate, user-owned login, no password to our server
- (Baad me) AdSense sirf public website content pages pe

### Out of scope (v1)
- Dhanlaxmi password store / auto-login
- Playwright / local Node panel
- Cloudflare bypass
- Desktop Electron app
- Extension ke andar Google AdSense

---

## 2. User flow

1. User `https://your-domain.com` pe signup/login.
2. Dashboard: “Extension install karo” + short steps.
3. User Chrome me Dhanlaxmi khole → login → Product Wise Business → From/To date → Search.
4. Extension icon / popup → **Calculate & Save**.
5. Extension:
   - Current page se product table extract
   - Rules apply (`calculateBusiness`)
   - Page se account label / user id extract (jo DOM me available ho)
   - API `POST /api/captures` with website auth token
6. Website pe turant naya result dikhe (refresh ya live list).

Multiple accounts: logout/login dusra Dhanlaxmi account → Search → phir Calculate.

---

## 3. Architecture

```
[ Chrome: Dhanlaxmi tab ]
        ↓ content script (DOM read only)
[ Extension popup ]
        ↓ HTTPS + Bearer token
[ Website API + DB ]
        ↓
[ Website dashboard UI ]
```

- **Secrets:** Dhanlaxmi password kabhi extension→server payload me nahi.
- **Rules:** pehle extension me bundled JSON (baad me server se fetch optional).
- **Auth:** website session/JWT; extension me token save (`chrome.storage.local`).

---

## 4. Tech stack (recommended)

| Layer | Choice | Note |
|-------|--------|------|
| Website UI | Next.js (App Router) ya simple React + Vite | Jo tumhe comfortable ho |
| API | Same Next.js route handlers **ya** separate Express/Fastify | Ek repo me rakhna simple |
| DB | PostgreSQL (Neon/Supabase) ya SQLite (lite MVP) | Production me Postgres better |
| Auth | Email+password (Auth.js / Clerk / custom JWT) | Login compulsory |
| Extension | Chrome Manifest V3 | `content_scripts` + `popup` + `service_worker` |
| Shared logic | TypeScript package `packages/rules` | `xlnc` ke `rules.js` se port |

**Monorepo (suggested):**
```
dhanlaxmi-web/
  apps/web/           # website + API
  apps/extension/     # Chrome MV3
  packages/rules/     # calculateBusiness + types
  packages/shared/    # API types, constants
  WEB_EXT_PROJECT_PLAN.md
  README.md
```

---

## 5. Data model (minimum)

### `users`
- `id`, `email`, `password_hash`, `created_at`

### `captures` (har Calculate click)
- `id`
- `user_id` → website user
- `dl_account_id` (string/number, page se)
- `dl_account_name` (display, page se; na mile to null)
- `start_date`, `end_date` (page inputs se; na mile to null)
- `business_date` (jis din capture hua / end_date)
- `total_business` (number)
- `turnover` (number | null)
- `ignored_products` (JSON)
- `half_products` (JSON)
- `details` (JSON, optional — bada ho to baad me)
- `source` = `extension`
- `created_at`
- Unique optional: `(user_id, dl_account_id, start_date, end_date)` pe upsert policy decide karo

**Policy suggestion (v1):** same account + same date range → **update** last capture (upsert). History chahiye to baad me versions.

---

## 6. API (v1)

| Method | Path | Auth | Kaam |
|--------|------|------|------|
| POST | `/api/auth/register` | no | signup |
| POST | `/api/auth/login` | no | → token |
| GET | `/api/me` | yes | current user |
| POST | `/api/captures` | yes | extension save |
| GET | `/api/captures` | yes | list (filter account/date) |
| GET | `/api/captures/summary` | yes | totals per account |
| GET | `/api/rules` | yes | (optional) rules JSON |

### `POST /api/captures` body (example)
```json
{
  "dlAccountId": "2048452",
  "dlAccountName": "Ram",
  "startDate": "2026-04-01",
  "endDate": "2026-11-23",
  "totalBusiness": 12345.67,
  "turnover": 99999.00,
  "ignoredProducts": ["..."],
  "halfProducts": ["..."],
  "details": []
}
```

**Kabhi accept mat karo:** `password`, cookies, raw HTML poora page (optional debug flag alag).

---

## 7. Chrome extension

### Permissions
- `host_permissions`: `https://login.dhan-laxmi.co.in/*`
- `host_permissions`: `https://your-domain.com/*` (API)
- `storage`

### Pieces
1. **content script** (Dhanlaxmi pages)
   - Table extract (port from `xlnc/src/dashboard.js` → `extractProductRows` DOM part)
   - Date inputs read
   - Account id/name selectors (discover pe pehla kaam — UI inspect)
2. **popup**
   - Website login status
   - Button: Calculate & Save
   - Last result preview + errors (“table nahi mili”, “pehle Search karo”)
3. **background/service worker**
   - API calls, token refresh (agar ho)

### Calculate path
```
extract rows → calculateBusiness(rows, rules) → POST /api/captures
```

Logic port: `xlnc/src/rules.js` + `config/business-rules.json` + `TOTAL_BUSINESS_RULES.md`.

---

## 8. Website pages

| Page | Kaam |
|------|------|
| `/` | Landing + disclaimer + “not official Dhanlaxmi” |
| `/login`, `/register` | Auth |
| `/dashboard` | Captures table, per-account cards |
| `/accounts/:id` | Ek Dhanlaxmi account ki history |
| `/install` | Extension install steps |
| `/privacy` | Privacy (AdSense / trust ke liye) |
| `/about` | Scope: calculate only, no site changes |

Footer disclaimer (short Hinglish + English).

---

## 9. Security & trust

- Dhanlaxmi credentials server pe nahi
- HTTPS only
- Extension token expire + logout
- CORS: sirf extension / website origin
- Rate limit `POST /captures`
- Input validation (numbers, string length)
- Clear copy: user apni permission se apna account khud use karta hai; tool sirf visible table se calculate karta hai

---

## 10. Ads (baad me)

- AdSense **sirf** public website content pages (`/`, blog/docs)
- `/dashboard` (logged-in app) pe ads optional / avoid
- Extension popup me AdSense **mat** dalo

---

## 11. Purane `xlnc` se kya copy karna

| Copy / port | Path ab |
|-------------|---------|
| Formula + helpers | `src/rules.js` |
| Rules JSON | `config/business-rules.json` |
| Rules docs | `TOTAL_BUSINESS_RULES.md` |
| Table column mapping idea | `src/dashboard.js` (`extractProductRows`) |

**Mat copy karo (is product me nahi):** `browser.js` CDP, DPAPI, local panel auto-login loop — alag product hai.

---

## 12. Build phases

### Phase 0 — Setup (half day)
- Nayi folder + git repo
- Monorepo scaffold (web + extension + rules package)
- README: local run steps

### Phase 1 — Rules package + unit tests
- `calculateBusiness` port
- Sample rows se expected totals verify

### Phase 2 — Website auth + captures API + dashboard UI
- Register/login
- Manual `POST` se fake capture insert karke UI check

### Phase 3 — Extension MVP
- Content script table extract
- Popup calculate (local preview pehle, save baad me)
- Account name/id DOM discovery
- Token login from popup → Save to API

### Phase 4 — Polish
- Upsert policy, empty states, error messages
- Disclaimer + privacy
- Extension Chrome Web Store zip (unlisted pehle)

### Phase 5 — Optional
- Rules admin on website → extension fetch
- Excel export
- AdSense on landing

---

## 13. Acceptance criteria (v1 done)

- [ ] Website bina login dashboard nahi
- [ ] Extension logged-out user ko save nahi karne deti
- [ ] Search ke baad Calculate → sahi `total_business` / `turnover` (xlnc rules se match)
- [ ] `dl_account_id` / name store (jo DOM se mil sake)
- [ ] 2+ Dhanlaxmi accounts ke captures website pe alag dikhte hain
- [ ] Payload me password field possible hi nahi (API reject / schema me absent)
- [ ] Disclaimer landing + popup me visible

---

## 14. Open decisions (build start pe fix karo)

1. Domain / hosting (Vercel + Postgres? VPS?)
2. Auth provider (custom vs Clerk)
3. Upsert vs append history
4. Extension public store vs manual `.zip` install pehle
5. Project folder path + git remote

---

## 15. Start command (nayi location pe)

Jab naya folder banao, pehla kaam:

1. Is file ko wahan copy karo  
2. `packages/rules` me `xlnc` se logic port  
3. Phase 0 → 1 → 2 → 3 order me raho  

Agent ko bolo: *“`WEB_EXT_PROJECT_PLAN.md` follow karke yahan naya project scaffold karo”* — **xlnc folder me nahi.**
