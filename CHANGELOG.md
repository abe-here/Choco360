# Changelog

All notable changes to Choco360 will be documented here.

---

## [1.6.0] — 2026-04-09

### 新功能

- **主管中心（Approvals → 我的團隊）**：主管可直接在主管中心查看所有 direct reports 的 PRP 記錄與 360 洞察報告，三層 drill-down 導航（提名審核 / 我的團隊 → 成員詳情 → 各項詳細頁），無需切換頁面。
- **個人中心年份時間軸**：「個人中心」整合原「我的報告」功能，以年份分群同時呈現 PRP 記錄卡片（琥珀色）與 360 洞察卡片（靛藍色），年份從提名標題萃取（regex），避免跨年誤分。
- **360 洞察命名**：原「成長報告」更名為「360 洞察」，名稱更精準反映功能定位。

### 改善

- **導覽精簡**：移除獨立「我的報告」側邊欄項目；「審核名單」更名為「主管中心」；Approvals 內的篩選 tab（待處理 / 歷史核准）改為分層顯示，與主要 tab（提名審核 / 我的團隊）視覺上明確區隔。
- **社群交流**：開發者留言板移至頁面上半部，搜尋與英雄卡片 grid 置於下方。

### 技術

- `Reports.tsx` 新增 `subjectUser` & `initialNominationId` props，支援主管嵌入式閱覽而不影響原有個人使用流程。
- `prpImportService` 測試更新：反映通用標籤（如 "KPI 1"）normalization 後的正確預期值。

---

## [1.5.0] — 2026-03-xx

### 新功能

- PRP 匯入服務：支援以 Markdown 格式貼上考核表，透過 Gemini AI 解析為結構化 JSON 並存入 Supabase。
- PRP 編輯頁（TipTap WYSIWYG）：主管與管理員可編輯 KPI、核心職能、綜合考核等欄位。
- PRP 管理員介面（`PRPAdminManager`）：可依員工搜尋、匯入、預覽、刪除 PRP 記錄。

### 改善

- Gemini API 透過 nginx 反向代理，解決生產環境 405 / 504 問題。
- 閒置 Session 無限轉圈問題（memoryLock deadlock）修復。
- `supabase.ts` in-memory lock 防止多 tab 鎖爭用。

---

## [1.4.0] 以前

請參閱 Git commit 歷史。
