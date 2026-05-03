# Prompt 紀錄

精選 3 段代表性對話，依面試題目要求附上。完整未編輯的開發日誌見 [`docs/AI_JOURNAL.md`](../AI_JOURNAL.md)；Cross-agent review 紀錄見 [`docs/REVIEWS.md`](../REVIEWS.md)。

挑選邏輯：**多樣性優先，不求完整**。

1. **[範圍對齊](./01-scope-alignment.md)** — 把 JKO 題目 + 4 張 mockup 翻譯成具體計畫，code 還沒寫之前。展示 AI 不只是寫 code，也用在產品/需求推理。
2. **[技術決策的審查壓力](./02-search-on-cjk.md)** — 中文子字串搜尋實作。Claude 第一版漏看 production scale，Codex 抓出來建議 `pg_trgm` GIN。展示 cross-agent review 的價值。
3. **[正式部署 debug](./03-railway-deploy-debug.md)** — Railway 部署連續 3 個 production-only failure（DATABASE_URL 空字串 → Prisma openssl 不符 → Railway port routing 502）。展示 AI 作為 co-debugger，平台操作仍由人主導。

## Prompt 結構

長期 prompt 放在 [`AGENTS.md`](../../AGENTS.md)（單一 source of truth，Claude Code 跟 Codex CLI 都讀）。Hard Rules、必讀清單、cross-agent review workflow 都在那。每次 session 的 prompt 只寫**差異**（這 session 的新東西），其他靠 agent 自己讀 AGENTS.md。

迭代靠 [`docs/REVIEWS.md`](../REVIEWS.md) — 每個 milestone 都跑「Claude 實作 → Codex review → Claude 修正」。每次 Codex `changes-requested` 就是下一輪的 prompt。M5（`/search`）的 RR-006 經過 3 輪 reconfirmation 才 approved，是最具教學價值的 review trail。
