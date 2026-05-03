下面是潤過的版本，會比較像「我如何在 production deploy 現場使用 AI 協助 debug」，而不是單純紀錄錯誤。

---

# Prompt 3 — Railway 部署現場 Debug

**日期**：2026-05-03
**Agent**：Claude Code（Opus 4.7）
**階段**：M8 — Railway production deploy

## 背景

本機 Docker build 與 container run 都已經通過。程式 push 到 GitHub 後，透過 Railway 從 GitHub import 並進行 production deploy。

部署過程中遇到三個 production-only failure。這些問題本機環境都沒有重現，而且分別發生在不同層：

1. Railway service environment variables
2. Prisma binary target 與 OpenSSL runtime
3. Railway router target port

這個 session 的協作方式是：我負責操作 Railway UI、確認 dashboard 狀態與貼 deploy log；AI agent 負責根據 log 做診斷、縮小假設範圍，並提出最短可行修法。

---

# Failure 1 — `DATABASE_URL` 被解析成空字串

## 現象

Railway 後端 service crash，log 顯示：

```txt
error: Error validating datasource `db`: You must provide a nonempty
URL. The environment variable `DATABASE_URL` resolved to an empty string.
```

當時我在 Railway 上將 BE service 的 `DATABASE_URL` 設成：

```txt
${{Postgres.DATABASE_URL}}
```

理論上它應該指向同一個 Railway project 裡的 Postgres service，而且 Postgres service 狀態是 Online。

## Prompt

我給 agent 的 prompt 大意是：

> BE 在 Railway crash。Log 說 `DATABASE_URL` 空。變數設成 `${{Postgres.DATABASE_URL}}`，指向同 project 的 Postgres service。Postgres 是 Online。問題在哪？

## 診斷過程

Agent 先協助我縮小幾個合理假設：

1. **Service name 是否大小寫不一致**
   例如 `Postgres` vs `postgres`。
   我確認 Railway service 名稱確實是 `Postgres`，reference 語法看起來也正確。

2. **Postgres service 是否真的有 `DATABASE_URL`**
   我從 Railway UI 截圖確認 Postgres service 裡存在該變數。

3. **變數是否設在正確的 backend service 上**
   最後發現我從同一個 GitHub repo 不小心 import 了兩次，Railway project 裡同時有 `JKOPay-interview` 與 `amused-vision` 兩個相關 service。
   `DATABASE_URL` 被設定在錯的 service 上，所以實際跑起來的 backend service 讀到的是空值。

## 解法

這次沒有繼續追 Railway interpolation 行為，而是採取最 pragamatic 的 demo 修法：

```txt
DATABASE_URL=postgresql://...
```

也就是直接把 Postgres connection string 原值貼到正在部署的 BE service 變數中。

對 demo deploy 來說，這比繼續追 variable reference 更穩定，也能快速排除環境變數解析層的問題。

---

# Failure 2 — Prisma binary target 與 OpenSSL runtime 不符

## 現象

Migration 已經成功跑完，Fastify server 也成功 boot 起來，但第一個 DB query 回 500。

Log 顯示：

```txt
PrismaClientInitializationError: Prisma Client could not locate the
Query Engine for runtime "debian-openssl-3.0.x".
This happened because Prisma Client was generated for
"debian-openssl-1.1.x", but the actual deployment required
"debian-openssl-3.0.x".
```

## Prompt

我給 agent 的 prompt 大意是：

> Migration 跑完了，Fastify boot 也起來，但第一個 query 500。Build 跟 runtime 都用 `node:22-bookworm-slim`，而且兩階段都 `apt-get install openssl`。為什麼 Prisma 還是用 1.1.x 生 client？

## 診斷

這個問題不是 Fastify，也不是 DB connection，而是 Prisma Client 產生時的 query engine binary target 和 Railway runtime 不一致。

雖然 Docker build stage 和 runtime stage 都裝了 OpenSSL 3，但 Prisma generate 時仍可能產出不符合實際 runtime 的 binary。也就是說，這不是單純靠 Dockerfile 裡安裝 `openssl` 就能保證解決的問題。

Agent 建議把修法改成宣告式，而不是命令式：直接在 `schema.prisma` 裡明確指定 Prisma Client 要包含 Railway runtime 需要的 binary target。

## 解法

在 `schema.prisma` 加上：

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```

這裡的設計是：

* `native`：給本機開發環境使用
* `debian-openssl-3.0.x`：給 Railway Docker runtime 使用

這個修正 commit 為：

```txt
a171e65
```

修完後重新 deploy，Prisma query engine mismatch 的問題解除。

---

# Failure 3 — Railway router 502

## 現象

後端 service log 看起來是健康的：

```txt
Server listening at http://127.0.0.1:8080
```

但從外部打 Railway domain 時，回應是：

```txt
502 Application failed to respond
```

前端 service 也出現類似狀況。

## Prompt

我給 agent 的 prompt 大意是：

> BE log 看起來健康但 Railway 回 502。FE 也有同樣狀況。Docker 在 Railway 上有什麼特別的？

## 診斷

問題出在 Railway domain 的 target port 與 app 實際 listen 的 port 不一致。

當我在 Railway Generate Domain 時，Railway 要求填 target port。我當時依照 Dockerfile 的 `EXPOSE` 填了：

```txt
BE = 3001
FE = 3000
```

但 Railway 同時會注入自己的 `PORT` environment variable。實際上 app 讀的是：

```ts
process.env.PORT
```

所以在 Railway 上 app 實際 listen 的 port 是：

```txt
8080
```

結果變成：

* App 實際 listen：`8080`
* Railway domain route target：`3001` / `3000`

兩者不一致，所以 Railway router 打不到 service，外部就回 502。

## 解法

進 Railway service 的 Networking 設定，編輯 domain，將 target port 改成：

```txt
8080
```

另一個更乾淨的做法是刪掉 domain 後重新 generate，target port 留空，讓 Railway 自動依照 `$PORT` 偵測。

---

# 收穫與反思

這次 deploy debug 很典型地展示了 AI agent 在實際部署場景中的價值。

三個錯誤都不是 application business logic 的問題，而是 production environment 才會出現的整合問題：

1. **平台變數設錯 service**
   問題不在程式，而在 Railway service mapping 與 environment variable 設定。

2. **Prisma binary target 與 OpenSSL runtime drift**
   本機與 Docker build 都通過，不代表 Prisma Client 產出的 binary 一定符合 production runtime。

3. **Railway router target port 與 `$PORT` 不一致**
   App 本身有啟動，但 edge router 指錯 port，所以外部仍然 502。

這個 session 裡，AI 的角色不是取代我操作平台，而是把冗長的 deploy log 快速轉換成具體假設與修法。
我負責確認 Railway dashboard 實際狀態、操作 UI、修改變數與重新 deploy；AI 負責協助判讀 log、排序可能原因，並提供最短可行修復路徑。

這點在 demo deploy 特別重要。當目標是 30 分鐘內把服務上線時，不一定每個問題都要追到平台內部機制完全清楚。更有效的策略是：

* 先找出最可能的原因
* 採取 reversible、低風險的修法
* 讓 production deploy 先恢復可用
* 再把真正值得長期化的修正寫回 code 或文件

例如這次三個解法都是 pragmatic 的：

* `DATABASE_URL`：直接貼 connection string，避免繼續卡在 variable reference
* Prisma：用 `binaryTargets` 明確宣告 runtime 需求
* Railway 502：讓 domain target port 對齊 `$PORT`

我覺得這是 AI 作為 deploy assistant 最有說服力的地方：
它不需要登入 Railway，也不需要持有 credentials。它只需要讀 log、理解平台常見陷阱，然後把可能原因壓縮成我可以在 dashboard 上立即驗證的操作。
