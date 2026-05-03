# Prompt 2 — 中文子字串搜尋（被 review 抓到）

**日期**：2026-05-02 → 2026-05-03（多輪 reconfirmation）
**Agents**：Claude Code（實作）↔ Codex CLI（審查）
**Milestone**：M2 API endpoints + production hardening
**Review**：[`docs/REVIEWS.md`](../REVIEWS.md) RR-002 / RR-003

## 背景

`GET /items?q=...` 要對 `title` + `description` 做大小寫不敏感的子字串搜尋。Mock 資料雙語但 demo 觀眾是台灣，CJK 字串沒空白可 tokenize。最簡單的 `ILIKE %q%` 不走 index，每次 query table-scan。

第一版 prompt：

> 加 `q` 到 `GET /items`，case-insensitive 部分比對 title + description。用 Prisma，不要 raw SQL。

## Claude 第一版

用 Prisma 的 `contains` + `mode: 'insensitive'`。功能正確，但 table-scan。

## Codex review 抓到 (RR-002)

> ILIKE 對未 indexed 的 text 欄位在 90 筆 mock data 上沒事，但 user memory 寫了「design for production scale」。Postgres 有 `pg_trgm`（trigram GIN）能高效索引子字串——而且**對 CJK 有效**，因為 3-char window 不靠空白 tokenize。Mock data 已經有「流浪動物之家」「食物銀行」這類，加 trigram index 之後每次搜尋變對數查找。

## 後續 prompt（驗證，不是直接照做）

> Codex (RR-002) 建議 `pg_trgm` GIN 處理 `q` filter 讓 CJK 子字串上 index。驗證：(1) Prisma migration 怎麼宣告 raw GIN index？(2) 子字串長度門檻多少（trigram 什麼時候不再有用）？(3) production 部署有什麼平台限制（Railway / Neon 是否內建）？

## Claude 驗證後

- Prisma 在 migration 用 raw SQL 寫 GIN DDL，client 還是只跑 ORM。
- Trigram threshold = 3 字。少於 3 字會降級成 seq-scan（可接受，1-2 字搜尋本來就不太有用）。
- Railway 託管 Postgres 跟 Neon 都預設裝 `pg_trgm`，不用平台特例處理。

## 結果

採納。寫成 [ADR-0010 — `pg_trgm` GIN 中文子字串搜尋](../decisions/0010-pg-trgm-cjk-search.md)。3 字門檻變成 API contract 的一部分——前端搜尋輸入也跟著加最少 3 字才打 API（debounce + min length）。

## 教訓

這是 **dual-agent review 自帶價值**的代表案例。Claude 第一版技術正確（合 Prisma rule、合 Hard Rule 不寫 raw SQL）但漏看 production scale。Codex 抓到，是因為 Codex 是依 user memory rule（「design for production scale, not mock-seed size」）審。這正是 cross-agent review 該做的事。

回 Claude 的 prompt 不是「實作 Codex 建議」而是「**驗證**」。保留 Claude 自己判斷，順便把邊角條件挖出來（3 字門檻），不會變成 migration 裡的隱性假設。
