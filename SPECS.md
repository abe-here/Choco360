# Choco360 系統總體規格索引 (Project Index)

本系統採模組化規格設計。根據「使用者旅程 (User Journey)」與「單頁行為 (Page Behavior)」，劃分為以下 6 大規格書，以完美對應 E2E 測試腳本（TDD 架構）。

## 📖 規格模組導覽

1. **[Authentication & Core Architecture](./specs/01_Auth_and_Core.md)** 
   👉 對應 `App.tsx` / `tests/e2e/auth.spec.ts`
2. **[Admin Configuration](./specs/02_Admin_Configuration.md)** 
   👉 對應 `AdminPanel.tsx` / `tests/e2e/admin.spec.ts`
3. **[Profile & Onboarding](./specs/03_Profile_and_Onboarding.md)** 
   👉 對應 `Profile.tsx`, `Dashboard.tsx` / `tests/e2e/profile.spec.ts`
4. **[Nomination Flow](./specs/04_Nomination_Flow.md)** 
   👉 對應 `Nomination.tsx`, `Approvals.tsx` / `tests/e2e/nomination.spec.ts`
5. **[Feedback Execution](./specs/05_Feedback_Execution.md)** 
   👉 對應 `FeedbackForm.tsx` / `tests/e2e/feedback.spec.ts`
6. **[Reports & AI Coach](./specs/06_Reports_and_AI.md)** 
   👉 對應 `Reports.tsx` / `tests/e2e/reports.spec.ts`

---
## 🛠️ 測試驅動規範 (TDD Policy)
- 當功能變更或新增修訂時，請優先尋找上方對應的 MD 規格書進行修改。
- 功能開發前，請確保 E2E 測試 (`.spec.ts`) 已涵蓋 MD 中的 User Journey 並進入 Red Phase。
- 功能實作完成後，測試必須全部綠燈 (Green Phase) 方可合併至主線。