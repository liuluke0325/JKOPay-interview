# Prompt 1 — 從題目 + Mockup 對齊範圍

**日期**：2026-05-02
**Agent**：Claude Code (Opus 4.7)
**階段**：Phase A — 純文件對齊，code 還沒開始

## 背景

JKO 題目跟 4 張行動 UI mockup 在 agent-collab scaffold 之後才到。Mockup 大幅改變資料模型假設（單一 `Item` table 加 category enum + 可空欄位；子分類是真的 filter 不是 stub；獨立 `/search` 路由；每筆 item 有詳細頁）。在寫 code 之前需要先把題目編進文件框架：Hard Rules、acceptance criteria、milestones、risks。

## Prompt 寫法

不是問「需求應該怎樣」，而是請 agent **在 plan-mode 起草計畫**列出具體 delta（資料夾改名、TODO 替換、設計衍生的 API shape），然後 **把所有影響範圍的問題集中成一輪**用 `AskUserQuestion` 問完——不要逐題問：

> 起一份 Phase A 計畫：(1) 把 `docs/DECISIONS.md` 改成 `docs/decisions/` 資料夾（題目要求的路徑）；(2) 在 `AGENTS.md` 寫真正的 Hard Rules；(3) 用四張 mockup 推出來的 criteria 替換 `REQUIREMENTS.md` 的 `<!-- TODO -->` 區塊；(4) 排 M0–M9 milestones；(5) 開 risk register。任何會大改計畫的 scope 問題就停下來問——**集中一輪**，不要一題一題問。

## 一輪問了 8 題

1. 三個分頁全做還是只做一個？
2. `全部 ▼` 子分類 — 真做還是 stub？
3. 詳細頁要做嗎？
4. Mobile 還是含 desktop？
5. Search 取消後要還原 tab + 滾動位置嗎？
6. i18n — zh-TW only 還是含 en stub？
7. 後端部署 — Railway / Render / Fly？
8. 測試 — required 還是 nice-to-have？

## 結果

User 一次回答 8 題，計畫執行：9 個 ADR（2 流程、7 技術）、`AGENTS.md` Hard Rules（10 條）、`REQUIREMENTS.md` 的 §A–§F acceptance criteria、`PROGRESS.md` 的 M0–M9、`RISKS.md` 的 R1–R12。

## 教訓

Mockup 比題目晚到，**大改了資料模型**。新設計資料一進來就重做需求遍歷，不要假設 v1 計畫還能用。AI 在這裡扮演的是「圖+文 → 結構化文件 delta」的快速翻譯，人是 scope oracle（一輪問完就跑）。

這 session 也校準了「**decide, don't ask**」這條 memory rule — agent 第一次草稿問太多低風險小事，被 push back，後面 session 變得很短。
