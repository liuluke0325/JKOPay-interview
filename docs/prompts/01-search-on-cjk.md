下面是潤過、比較適合給 interviewer 看的版本。重點會放在：**AI agent 不是只拿來生 code，而是用來做 implementation + review + verification loop**。

---

# Prompt 2 — 中文子字串搜尋與 Dual-Agent Review

**日期**：2026-05-02 至 2026-05-03
**Agents**：Claude Code（實作）↔ Codex CLI（審查）
**Milestone**：M2 API endpoints + production hardening
**Review 文件**：`docs/REVIEWS.md` RR-002 / RR-003

## 背景

`GET /items?q=...` 需要支援對 `title` 與 `description` 做 case-insensitive 的子字串搜尋。

因為 mock data 是雙語資料，而且 demo 主要面向台灣使用者，所以搜尋不能只考慮英文 token-based search。中文、日文等 CJK 字串通常沒有空白分詞，例如「流浪動物之家」、「食物銀行」這類關鍵字，如果只依賴一般 tokenization，效果會不穩定。

一開始最直覺的做法是使用 `ILIKE '%q%'` 或 Prisma `contains`，功能上可以滿足需求，但在 production scale 下會變成 table scan。雖然目前 mock data 只有約 90 筆，看不出效能問題，但專案規則明確要求不要只針對 mock seed size 設計。

## 第一版 Prompt

我先給 Claude 的 prompt 是：

> 加 `q` 到 `GET /items`，case-insensitive 部分比對 `title` + `description`。用 Prisma，不要 raw SQL。

## Claude 第一版實作

Claude 使用 Prisma 的 `contains` 搭配 `mode: 'insensitive'` 完成查詢條件。

這個版本在功能上是正確的，也符合「client query 使用 Prisma ORM、不直接寫 raw SQL」的限制。不過它沒有處理 production scale 下的子字串搜尋效能問題，因為一般 `contains` / `ILIKE '%q%'` 對未索引的 text 欄位通常會造成 table scan。

## Codex Review 發現的問題

在 RR-002 review 中，Codex 指出這個做法雖然在 90 筆 mock data 上沒問題，但不符合 production-oriented 的設計原則。

Codex 建議使用 PostgreSQL 的 `pg_trgm` 搭配 GIN index 來處理子字串搜尋。這個方法的好處是：

* 可以支援 `%keyword%` 類型的 substring search
* 不依賴空白分詞，因此對 CJK 字串也有幫助
* 比單純 `ILIKE` table scan 更適合 production scale
* 可以把效能設計從「mock data 可跑」提升到「資料量增加後仍合理」

這裡的重點不是 Codex 直接推翻 Claude 的實作，而是 review agent 從不同角度檢查了 production readiness。

## 後續 Prompt：要求驗證，而不是直接照做

我沒有直接要求 Claude「照 Codex 的建議實作」。我改用 verification prompt，讓 Claude 先驗證這個建議是否真的適合目前專案。

後續 prompt 大意如下：

> Codex RR-002 建議使用 `pg_trgm` GIN index 處理 `q` filter，讓 CJK 子字串搜尋可以走 index。
> 請先驗證：
> (1) Prisma migration 要怎麼宣告 raw GIN index？
> (2) 子字串長度門檻是多少？trigram 什麼情況下不再有效？
> (3) production 部署是否有平台限制？例如 Railway / Neon 是否支援 `pg_trgm`？

## Claude 驗證結果

Claude 驗證後整理出幾個結論：

1. **Prisma client query 仍維持 ORM 寫法**
   migration 中可以使用 raw SQL 建立 PostgreSQL extension 與 GIN index，但應用層查詢仍透過 Prisma client，不需要在 runtime query 寫 raw SQL。

2. **trigram 對搜尋字串長度有門檻**
   `pg_trgm` 的核心概念是 trigram，也就是 3-character window。因此搜尋字串少於 3 個字時，index 幫助有限，通常可能退回 seq scan。
   這個限制可以接受，因為 1 至 2 字的搜尋在產品上本來就容易產生過多結果，也比較不具辨識度。

3. **部署平台沒有形成明顯阻礙**
   Railway 託管 PostgreSQL 與 Neon 通常都支援 `pg_trgm` extension，因此不需要為特定平台額外切分方案。

## 最終決策

最後我採納 Codex 的建議，並把它正式寫成：

**ADR-0010 — `pg_trgm` GIN 中文子字串搜尋**

同時也把「最少 3 字才觸發搜尋」變成 API contract 與前端行為的一部分：

* 後端：`q` 小於 3 字時不執行 substring search，避免低價值查詢
* 前端：search input 加上 debounce
* 前端：至少 3 個字才打 `GET /items?q=...`
* 文件：把 3 字門檻寫進 ADR 與 API behavior，避免它變成隱性假設

## 收穫與反思

這是 dual-agent review 很有價值的一個案例。

Claude 第一版其實不是「錯」，它完成了 functional requirement，也符合一開始的 prompt 限制：使用 Prisma、不寫 runtime raw SQL、支援 case-insensitive partial match。

但 Codex review 補上了另一個角度：production scale。它不是只看功能有沒有過，而是依照專案的 memory rule，也就是 **“design for production scale, not mock-seed size”**，去檢查資料量變大後是否會出問題。

我認為這正是 cross-agent review 的價值：
一個 agent 負責 implementation flow，另一個 agent 負責從 hard rules、scale、edge cases 與 reviewer 視角挑問題。

更重要的是，我回給 Claude 的 prompt 不是「請直接實作 Codex 的建議」，而是「請先驗證 Codex 的建議」。這樣可以保留 Claude 的判斷空間，也能順便挖出實作邊界，例如 trigram 的 3 字門檻。

最後這個門檻被明確寫進 ADR 與 API contract，而不是藏在 migration 或 query behavior 裡。這讓後續前端、後端與 review 都有一致的依據。
