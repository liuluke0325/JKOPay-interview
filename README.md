# JKO 街口公益捐款 — 面試專案

仿街口 App「公益捐款項目 → 搜尋」流程。三個分頁（公益團體 / 捐款專案 / 義賣商品）+ 子分類篩選 + 無限滾動 + 搜尋路由 + 詳細頁。

## Demo

| | URL |
| --- | --- |
| 前端 | <https://jkopay-interview-production.up.railway.app/> |
| 後端 Swagger | <https://amused-vision-production-c79f.up.railway.app/docs> |
| Repo | <https://github.com/liuluke0325/JKOPay-interview> |

部署在 Railway 單一 project（Postgres + Fastify + Next.js）。冷啟動約 1–2 秒。

## 技術選型

| 層 | 選擇 |
| --- | --- |
| 前端 | Next.js 16 App Router · TypeScript · Tailwind v4 · `next-intl` (zh-TW) · TanStack Query · `react-window` v2 |
| 後端 | Fastify v5 · TypeScript · Prisma 6 · zod · `fastify-type-provider-zod` |
| 資料庫 | Postgres 16 · `pg_trgm` GIN（中文子字串搜尋） |
| 部署 | Railway（Docker × 2 + Postgres template） |

## API

三個 endpoint，詳見 Swagger UI：

- `GET /items?category=&subCategory=&q=&cursor=&limit=` → `{ items, nextCursor }`
- `GET /items/:id` → 完整 Item（404 if not found）
- `GET /sub-categories?category=` → `[{ value, label }]`

Cursor 用 base64url 編碼 `{createdAt, id}` 確保翻頁穩定（[ADR-0006](docs/decisions/0006-pagination-cursor.md)）。
搜尋走 `pg_trgm` GIN，3 字以上 trigram 索引，支援 CJK（[ADR-0010](docs/decisions/0010-pg-trgm-cjk-search.md)）。

## 本機開發

需求：Node 22 + Docker。

```bash
make setup     # 安裝 deps、起 Postgres、migrate、seed (390 筆)
make dev-all   # BE :3001 + FE :3000
```

打開 <http://localhost:3000>，Swagger 在 <http://localhost:3001/docs>。

其他 target：`make types`（重新生成 FE types from BE Swagger）、`make typecheck`、`make test`、`make db-shell`、`make reset`。

Env 範本：[`backend/.env.example`](backend/.env.example) · [`frontend/.env.example`](frontend/.env.example)

## 部署

詳見 [docs/DEPLOY.md](docs/DEPLOY.md)。Railway 一條龍（Postgres template + Dockerfile-based BE/FE），約 20 分鐘。

## 專案結構

```
backend/   Fastify + Prisma 服務（routes, prisma schema/migrations/seed, tests, Dockerfile）
frontend/  Next.js 16 App Router（pages, components, queries, i18n dictionaries, Dockerfile）
docs/      decisions/（13 個技術 ADR + 2 個流程 ADR）· prompts/（精選 AI 對話）·
           REQUIREMENTS / PROGRESS / REVIEWS / DEPLOY / RISKS
```

## 架構決策（ADR）

[`docs/decisions/`](docs/decisions/) 共 15 個 ADR，每個三段（Context / Decision / Consequences）。重點：

- [0006](docs/decisions/0006-pagination-cursor.md) Cursor 分頁 over offset
- [0010](docs/decisions/0010-pg-trgm-cjk-search.md) `pg_trgm` GIN 中文搜尋
- [0012](docs/decisions/0012-http-cache-vs-redis.md) HTTP `Cache-Control` + CDN 取代 Redis 熱讀層
- [0013](docs/decisions/0013-zod-single-source-of-truth.md) zod 同時驅動路由 + Swagger + OpenAPI
- [0015](docs/decisions/0015-openapi-typescript-codegen.md) `openapi-typescript` codegen 做 FE↔BE 型別共享

完整索引：[`docs/decisions/README.md`](docs/decisions/README.md)。

## AI 使用聲明

本專案以 AI 工具協作完成，採用「Claude 實作 → Codex 審查 → Claude 修正」的雙 agent 交叉審查流程，所有 review 紀錄在 [`docs/REVIEWS.md`](docs/REVIEWS.md)。

### 使用的 AI 工具

- **Claude Code**（Anthropic, claude-opus-4-7）— 主要實作者，跑在 VSCode 擴充。
- **Codex CLI**（OpenAI）— 交叉審查者，跑在另一個 terminal。

未使用 GitHub Copilot / Cursor / ChatGPT 網頁版。

### AI 負責的範圍

絕大部分原始碼為 AI 起草，commit 前由我審查並細部修正：

- 後端：Fastify 路由、Prisma schema/migrations/seed、zod schemas、env 解析、cursor 編解碼、rate-limit/CORS/trust-proxy 設定、21 個單元/整合測試。
- 前端：所有 App Router 頁面、client components（HomeClient / SearchClient / ItemDetail / ItemList / Card / Tabs 等）、TanStack Query hooks、OpenAPI client、scroll-restore 邏輯、zh-TW + en 字典。
- 文件：每個 ADR、acceptance checklist、deploy runbook、cross-agent review log、本 README。
- Build & deploy：Dockerfiles、`.dockerignore`、multi-stage build pipeline、Railway env-var 範本。

### 我自己負責的範圍

- **產品方向 & 範圍取捨**：決定哪些 milestone 全做、哪些精簡（例：M6 詳細頁砍掉 scroll-restore-on-back，紀錄在 [RR-007](docs/REVIEWS.md)）。
- **Cross-agent review 仲裁**：讀每份 Codex review，判斷接受 blocker 或 push back（見 [RR-006 三輪 reconfirmation](docs/REVIEWS.md)）。
- **正式部署**：所有 Railway 平台操作（建 project、Postgres template、GitHub import、env vars、Generate Domain、CORS 收緊、seed 資料、key rotation）。AI 寫好 runbook + Dockerfile，按鈕由我來按。
- **Live debug**：診斷 `${{Postgres.DATABASE_URL}}` 解析失敗、Prisma openssl-1.1.x vs 3.0.x binary 不符、Railway target-port 502 三個生產問題。
- **設計微調**：[`SearchInput.tsx`](frontend/src/components/SearchInput.tsx) 的搜尋列對齊調整，顏色等等。

## Prompt 紀錄

精選 3 段最具代表性的對話，放在 [`docs/prompts/`](docs/prompts/)（流程選擇、技術決策、生產 debug 各一）。完整未編輯的開發日誌保留在 [`docs/AI_JOURNAL.md`](docs/AI_JOURNAL.md)。

## 授權

私人 — 面試提交專用，非開源。
