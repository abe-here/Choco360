# 06. Reports & AI Coach

## 對應頁面與模組
- `components/Reports.tsx` — 個人成長報告主頁面
- `services/geminiService.ts` — Gemini AI 分析服務
- `services/api.ts` — 相關 API：`getNominationsByRequester`、`getFeedbacksForUser`、`getQuestionnaires`、`updateNominationAnalysis`

## 資料型別 (`types.ts`)
- **`AIAnalysis`**：`summary`(字串)、`strengths`(字串陣列)、`growthAreas`(字串陣列)、`actionPlan`(字串陣列)、`superpowers`(物件陣列，每項含 `title`, `category`, `description`)。
- 分析結果快取於 `Nomination.aiAnalysis`（對應 DB `nominations.ai_analysis` JSONB 欄位），同時記錄 `analysisFeedbackCount`。

## 使用者旅程 (User Journey)

1. 員工進入 **個人成長報告 (Reports)** 頁面後，系統自動載入：
   - 自己發起的所有 Nomination（`getNominationsByRequester`）
   - 所有指向自己的 Feedback（`getFeedbacksForUser`）
   - 所有問卷（`getQuestionnaires`）

2. **評鑑週期與對象切換**：
   - 若為系統管理員 (`isSystemAdmin` 為 true)，面板左上方會有「管理員視角：切換人員」的下拉選單，允許切換檢視全公司任一員工的報告。所有數據面板與文字清單的判定（例如區分「自評」與「他評」）皆依賴當前選中的對象 (`targetUserId`)，而非當前的登入者。
   - 頁面右上方有下拉選單，可切換不同 Nomination（顯示 `nomination.title`），預設選取最新且有資料的週期。
   - 切換後所有數據面板即時更新。

3. **視覺化數據 — 落差分析雷達圖 (SVG Radar Chart)**：
   - 使用手工 SVG 繪製（`ManualRadarChart` 子組件），**不依賴第三方圖表庫**。
   - 顯示兩條數據線：**自評**（靛藍 `#4f46e5`）與 **他評平均**（翠綠 `#10b981`）。
   - ⚠️ **目前沒有獨立的「主管評分」數據線**，僅以自評 vs 他評呈現。
   - **維度篩選**：雷達圖僅納入含有至少一題量表題 (rating) 的維度。純文字題 (text) 維度因無分數可計算，不列入雷達圖分析。
   - **計算邏輯**：每個符合條件的維度，取該維度下所有**量表題**的平均分數。他評平均排除 `score === 1`（代表「不清楚」），自評則不排除。
   - 雷達圖至少需 3 個維度方可顯示，不足時顯示「數據不足以生成雷達圖」。

4. **Gemini AI 成長導師面板**：
   - 深色卡片，標題為「Gemini AI 成長導師」。
   - 顯示目前分析所依據的回饋份數（`analysisFeedbackCount`）。
   - 點擊「生成 AI 洞察」按鈕觸發分析。
   - **前提條件**：需包含自評與至少一位他評（`currentFeedbacks.length >= 2`），不足則彈出 Alert 提示。若過程產生分析失敗（包含 AI 服務異常或資料庫寫入之 RLS 權限阻擋），會透過 Alert 彈出錯誤訊息。
   - **AI 服務 (`geminiService.ts`)**：
     - 使用 `@google/genai` SDK，模型為 `gemini-3-pro-preview`。
     - 以 `responseMimeType: 'application/json'` + `responseSchema` 強制 Structured Output。
     - Prompt 包含量化評分數據與文字回饋，System Instruction 含問卷維度定義。
     - 回傳 JSON 結構：`summary`（≈60 字摘要）、`strengths`（3 項優勢）、`growthAreas`（2 項改進建議）、`actionPlan`（3 項行動步驟）、`superpowers`（最多 3 個超能力物件，每項含 `title` 英文稱號、`category` 類別 `strategic/support/leadership`、`description` 繁中說明）。
   - **結果快取**：分析完成後呼叫 `updateNominationAnalysis` 將結果寫入 `nominations.ai_analysis`，下次進入頁面可直接顯示。
   - **UI 呈現**：summary 以引用格式展示於面板頂部，strengths 與 growthAreas 分列兩欄。
   - ⚠️ **目前未實作 actionPlan 的 UI 呈現**：`actionPlan` 欄位有從 AI 回傳但未在畫面上渲染。
   - ⚠️ **目前未實作匯出 PDF 功能**。

5. **原始數據細項 (Raw Feedback Metrics)**：
   - 底部展開所有維度與題目的逐題詳細數據。
   - 每個維度顯示：維度名稱、目的 (`purpose`)、維度自評平均、維度他評平均。
   - 每題依題型顯示：
     - **量表題 (Rating)**：以 `ScoreBadge`（彩色方塊）逐筆列出所有他評分數與自評分數，並在側邊卡片顯示本題他評平均（排除 1 分）及自評分值，附進度條。
     - **文字題 (Text)**：分別展示「您的自評觀點」（靛藍背景）與「同事具體觀察描述」（白色卡片，匿名化）。

## 目前未實作功能
- `actionPlan` 的 UI 展示（AI 有回傳但畫面未顯示）
- 主管評分的獨立數據線（原規格提及權重概念，目前未實作）
- 管理者是否可「開放看報告」的權限控制

## 測試腳本索引
👉 `tests/e2e/reports.spec.ts`

