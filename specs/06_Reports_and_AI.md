# 06. Reports & AI Coach

## 對應頁面與模組
- `components/Reports.tsx`
- `services/geminiService.ts`

## 使用者旅程 (User Journey)
1. 當 360 互評週期結束（或管理者開放看報告時），員工進入 **我的報表 (Reports)** 頁面。
2. **視覺化數據 (Radar Chart)**：
   - 呈現一張雷達圖，顯示各維度的「自己評分」、「主管評分」、「同儕平均評分」。
   - 系統背後算分有權重（例如主管 1 票抵 3 票），並以此算出最終平均數。
3. **質化回饋列表**：
   - 將其他人給的文字評語匿名化陳列出來（可分為「優勢」、「待改進」）。
4. **AI 總結與教練 (Gemini Integration)**：
   - 點擊「產生 AI 總結報告」。
   - 系統透過 `geminiService.ts`，將該員工所有的匿名文字評語與分數打包發送給 Gemini 3 Pro (JSON Mode)。
   - AI 分析出 3 大強項、3 個發展痛點，並給予具體可行的 1 項行動建議 (Action Item)。
   - UI 端用優雅的樣式呈現這份客製化 AI 報告，並提供匯出 PDF 功能。

## 測試腳本索引
👉 `tests/e2e/reports.spec.ts`
