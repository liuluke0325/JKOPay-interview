# Requirements & Acceptance Checklist

The acceptance bar for interview-jopay. Distilled from the JKO interview brief
(charity-donation listing) and the four UI mockup screenshots. Keep this
updated as scope shifts — it's the contract for "done".

## 0. One-line goal

JKO / 街口 interview assignment: build a charity-donation (公益捐款) project
listing experience — a tabbed card list with infinite scroll, search, and
sub-category filtering, backed by a Node/Fastify API serving paginated mock
data from a Postgres database via Prisma.

## 1. Hard constraints (do not deviate)

- **TypeScript only** in both frontend and backend; no `.js` source files outside config.
- **Frontend:** Next.js (App Router) + Tailwind + `next-intl` (zh-TW default).
- **Backend:** Fastify, separate Node process from the frontend.
- **ORM:** Prisma. No raw SQL.
- **Database:** Postgres. Local via docker-compose; managed via Neon for the demo.
- **Pagination:** cursor-based on every list endpoint (`{ items, nextCursor }`).
- **Demo URL must be live by submission.** No live URL = brief failed.
- **README must include** install/run instructions, API documentation, `## AI 使用聲明`, and a pointer to the prompt-records folder.
- **`docs/decisions/` must contain ≥3 *technical* ADRs at submission** (process ADRs don't count).

## 2. Components

| Component               | Responsibilities                                                         |
| ----------------------- | ------------------------------------------------------------------------ |
| Frontend (Next.js)      | Default view (`/`), search route (`/search`), detail route (`/items/[id]`); tabs, sub-category filter, infinite scroll, search, i18n, responsive layout |
| Backend (Fastify)       | `GET /items`, `GET /items/:id`, `GET /sub-categories`; cursor pagination; case-insensitive search |
| Database (Postgres)     | Single `Item` table with category + sub-category enums and nullable category-specific fields |
| Mock data seed          | `prisma db seed` populates ≥30 items per category (≥90 total); real logos for some |
| FE deploy (Vercel)      | Builds the Next.js app and serves the demo                               |
| BE deploy (Railway)     | Hosts the Fastify service with Render as fallback                        |
| Managed DB (Neon)       | Serverless Postgres for the deployed environment                         |

## 3. Data model

Single Prisma `Item` table — category-specific fields are nullable columns on the same row:

```
Item {
  id           String      @id @default(cuid())
  category     Category    // enum: ORG | CAMPAIGN | MERCHANDISE
  subCategory  String      // free-form within a category, e.g. "動物保護"
  title        String
  description  String
  logoUrl      String
  createdAt    DateTime    @default(now())

  // CAMPAIGN-only (nullable for others)
  amountRaised Int?
  amountGoal   Int?
  deadline     DateTime?

  // MERCHANDISE-only (nullable for others)
  price        Int?
  stock        Int?

  @@index([category, subCategory, createdAt])
}
```

Tab → category mapping:
- `公益團體` → `ORG`
- `捐款專案` → `CAMPAIGN`
- `義賣商品` → `MERCHANDISE`

## 4. API contract

- `GET /items?category=&subCategory=&q=&cursor=&limit=`
  - `category` required (`ORG` / `CAMPAIGN` / `MERCHANDISE`)
  - `subCategory` optional
  - `q` optional, case-insensitive match against `title` and `description`
  - `cursor` optional opaque string (base64 of `{createdAt, id}`)
  - `limit` default 20, max 100
  - Response: `{ items: Item[], nextCursor: string | null }`
- `GET /items/:id` → full `Item` (404 if not found)
- `GET /sub-categories?category=` → `[{ value: string, label: string }]`

## 5. Acceptance criteria

### A. List page (default view, `/`)

- [ ] Red header `所有捐款項目` renders at top
- [ ] Three tabs render: `公益團體` (default), `捐款專案`, `義賣商品`; switching tabs swaps the list and updates `?tab=` in URL
- [ ] `全部 ▼` filter dropdown shows real sub-categories from `GET /sub-categories`; selecting one filters the list
- [ ] Initial load renders a virtualized card list (react-window) of items in the selected tab
- [ ] Each card shows logo + 1-line bold title (ellipsis) + 2-line gray description (ellipsis)
- [ ] Scrolling near the bottom triggers fetch and appends new cards
- [ ] No duplicate cards on rapid scroll or refetch
- [ ] End-of-list separator (`— 愛心沒有底線 —`) shows when no more pages
- [ ] Tab + scroll position survive a navigate-away → back cycle
- [ ] Layout is mobile-first; on `md+` viewports renders centered with sensible max-width

### B. Search (dedicated route, `/search`)

- [ ] Tapping the search icon routes to `/search` with the input focused
- [ ] Search input shows the magnifier icon + `取消` button
- [ ] Tapping `取消` routes back to `/` and **restores prior tab + scroll position**
- [ ] Typing debounces ~300ms and triggers a fetch
- [ ] In-flight requests are aborted when the query changes (no stale paints)
- [ ] Loading state shows a centered spinner while fetching
- [ ] Tabs render under the search input; results are scoped per tab; switching tab re-fetches with new `category`
- [ ] Empty state shows the illustration + `查無相關資料` / `請調整關鍵字再重新搜尋`
- [ ] Search results infinite-scroll the same way as the default list

### C. Detail page (`/items/[id]`)

- [ ] Clicking a card on the list or search routes to `/items/[id]`
- [ ] Red header retained with `<` back button (matches mockup chrome)
- [ ] Renders title, description, logo, sub-category badge
- [ ] Renders category-specific mock fields: `CAMPAIGN` shows progress bar (`amountRaised`/`amountGoal`) + `deadline`; `MERCHANDISE` shows `price` + `stock`; `ORG` shows just the description block
- [ ] Tapping `<` (or browser back) returns to the originating list (`/` or `/search`) with prior tab + scroll position restored

### D. Backend API

- [ ] `GET /items` accepts `category` (required), `subCategory` (optional), `q` (optional), `cursor` (optional), `limit` (default 20, max 100)
- [ ] Returns `{ items: [...], nextCursor: string | null }`
- [ ] `q` matches case-insensitively against title and description
- [ ] `GET /items/:id` returns the full item (404 if not found)
- [ ] `GET /sub-categories?category=...` returns `[{ value, label }]` for the dropdown
- [ ] All DB access goes through Prisma; no raw SQL
- [ ] Mock seed populates ≥30 items per category (≥90 total) with realistic logos for some

### E. i18n & responsive

- [ ] All visible UI strings flow through `next-intl` dictionaries (zh-TW default)
- [ ] An English dictionary stub exists (can be partial)
- [ ] Mobile (375px), tablet (768px), and desktop (≥1024px) layouts all render without overflow

### F. Testing (brief bonus #3)

- *Unit tests (backend):*
  - [ ] Cursor encode/decode round-trip
  - [ ] `GET /items` filters correctly by `category` + `subCategory` + `q`
  - [ ] `GET /items` pagination yields stable, non-overlapping pages
  - [ ] `GET /items/:id` returns 404 for unknown id
  - [ ] `GET /sub-categories` returns the right list per category
- *Unit tests (frontend):*
  - [ ] Debounce + AbortController fires only the last query
  - [ ] Tab + scroll restore reads/writes URL + sessionStorage correctly
- *E2E tests (Playwright or equivalent):*
  - [ ] Default view loads, infinite scroll appends cards, no duplicates
  - [ ] Tab switch swaps the list and updates `?tab=`
  - [ ] Sub-category filter narrows results
  - [ ] Search route: type → debounce → results render; rapid typing doesn't paint stale results
  - [ ] Search → no results → empty state visible
  - [ ] Search `取消` → restores prior tab + scroll position
  - [ ] Card click → detail page → back → scroll position restored

### G. Submission

- *GitHub repo + Demo link:*
  - [ ] GitHub repo public; full source + README at root
  - [ ] Demo URL (Vercel) deployed and reachable from a fresh browser (private window)
  - [ ] Both links included in the submission email
- *README sections (each independently verifiable):*
  - [ ] **Install & run** — local steps end-to-end (Postgres up, seed, BE, FE)
  - [ ] **API documentation** — every endpoint, query params, response shape
  - [ ] **`## AI 使用聲明`** containing the brief's three required bullets:
    - [ ] 使用的 AI 工具 (which AI tools were used, e.g. Claude / Cursor / ChatGPT)
    - [ ] AI 負責的範圍 (which modules / files were AI-produced or AI-assisted)
    - [ ] 你自己負責的範圍 (which parts you completed independently or substantially modified)
  - [ ] **Prompt 紀錄 pointer** — explicit pointer to `docs/prompts/` (we are doing Option 1 from the brief; see note below)
- *`/docs` folder:*
  - [ ] `docs/decisions/` has ≥3 technical ADRs (0003+) with bodies filled in (not just stubs)
  - [ ] `docs/prompts/` exists (renamed from `docs/AI_JOURNAL.md` at M9) with 2–3 representative AI exchanges curated

> **Prompt 紀錄 option chosen: Option 1** — exports/curated exchanges live in `docs/prompts/`. The README's `## AI 使用聲明` section provides the pointer; it does NOT also need to be a free-form summary (Option 2 is not being claimed).

## 6. Run guide / packaging

- [ ] `README.md` documents native local run end-to-end (Postgres up, seed, BE, FE)
- [ ] `docker-compose up` starts Postgres locally
- [ ] `.env.example` documents `DATABASE_URL` and any other config
- [ ] `npm run dev` (or equivalent) starts FE and BE; root-level workspace tooling acceptable

## 7. Out of scope / explicit non-goals

- User authentication / accounts
- Real donation payment flow (cards are display-only at the detail level)
- Server-side rendering of the list (client-side fetch is sufficient and better suits infinite scroll)
- Admin / CMS surface for managing items
- Real-time updates (websockets, polling) — the list is read-only mock data
