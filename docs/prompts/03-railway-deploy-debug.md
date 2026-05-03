# Prompt 3 — Railway 部署現場 debug

**日期**：2026-05-03（M8 部署 session）
**Agent**：Claude Code (Opus 4.7)
**階段**：M8 — Railway production deploy

## 背景

本機 Docker build 通。Push 到 GitHub，Railway 從 GitHub import。**接連三個 production-only failure**，每個解法都不同。我操作 Railway UI，AI 從 deploy log 診斷。實戰版的 AI 部署協助長這樣。

## Failure 1 — `DATABASE_URL` 解析成空字串

**Log**:
```
error: Error validating datasource `db`: You must provide a nonempty
  URL. The environment variable `DATABASE_URL` resolved to an empty string.
```

**Prompt**：

> BE 在 Railway crash。Log 說 `DATABASE_URL` 空。變數設成 `${{Postgres.DATABASE_URL}}`，指向同 project 的 Postgres service。Postgres 是 Online。問題在哪？

**追的假設**：

1. Service 名稱大小寫對不上（`Postgres` vs `postgres`）— 確認 service 確實叫 `Postgres`，reference 語法正確。
2. Postgres 沒這個變數 — 截圖確認有。
3. 變數設在錯的 BE service — 我從同 repo 不小心 import 兩次（`JKOPay-interview` + `amused-vision`），env 設在錯的那個。

**解法**：不追 Railway 的 interpolation 行為，**直接繞過 reference**——把 `postgresql://...` 整串原值貼進去 BE 的 `DATABASE_URL`。Demo 用 pragmatic > 完美。

## Failure 2 — Prisma binary 不符

**Log**：
```
PrismaClientInitializationError: Prisma Client could not locate the
Query Engine for runtime "debian-openssl-3.0.x".
This happened because Prisma Client was generated for
"debian-openssl-1.1.x", but the actual deployment required
"debian-openssl-3.0.x".
```

**Prompt**：

> Migration 跑完了，Fastify boot 也起來，但第一個 query 500。Build 跟 runtime 都用 `node:22-bookworm-slim` 而且兩階段都 `apt-get install openssl`。為什麼 Prisma 還是用 1.1.x 生 client？

**診斷**：兩階段都裝了 openssl-3.0 沒錯，但 `prisma generate` 自動偵測時挑了 1.1.x（legacy 預設），除非 schema 明確指定。修法是**宣告式**，不是命令式。

**解法**：在 `schema.prisma` 加：

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```

`native` 給本機（一個 binary 就好），`debian-openssl-3.0.x` 給 Railway。Commit `a171e65`。

## Failure 3 — Railway router 502

**現象**：
- `curl <BE-URL>` → `502 Application failed to respond`
- BE log 顯示 `Server listening at http://127.0.0.1:8080`

**Prompt**：

> BE log 看起來健康但 Railway 回 502。FE 同症狀。Docker 在 Railway 上有什麼特別的？

**診斷**：Railway Generate Domain 時問「target port」，我填 BE = `3001`、FE = `3000`（對應 Dockerfile 的 `EXPOSE`）。但 Railway **同時注入自己的 `PORT` env var**（`8080`），app 讀 `process.env.PORT` 所以綁到 `8080`，Railway 卻 route 到 `3001`/`3000`。對不上。

**解法**：Railway service Networking → 編輯 domain → target port 改 `8080`，或刪掉重 generate 時把 port 留空（讓 Railway 從 `$PORT` 自動偵測）。

## 教訓

三個失敗在三個層（平台變數解析、Docker base image OpenSSL drift、edge-router port 對不上）。AI 在這 session 的價值：

1. **對 deploy log 做 pattern matching**。錯誤訊息冗長但具體，貼給 AI 之後每個都有單一合理診斷 + 已知修法。
2. **偏好簡單修法**。三次都建議 pragmatic 路線（直接貼 URL、宣告 binaryTargets、port 留空），不去翻平台文件追根究柢。Demo 30 分鐘要上線時，這很重要。
3. **平台由人掌握**。AI 從來不登 Railway、不持 credentials、不按按鈕。它讀 log + 提建議，按鈕由我按。

這種 session 是 deploy 時 AI 守在 *助手* 角色的最強論證：AI 把平台文件壓縮成你的具體錯誤，但 dashboard 真的長那樣只有你能確認。
