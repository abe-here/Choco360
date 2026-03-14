# 01. Authentication & Core Architecture

## 對應頁面與模組
- `App.tsx` (系統入口、路由中心)
- `components/Layout.tsx` (全域導覽列)
- `services/supabase.ts` (資料庫連線與 RLS 層)

## 使用者旅程 (User Journey)
1. **訪客 (未登入)** 進入 `http://localhost:3000`。
2. 系統檢測到無可用 Session，顯示「Google 帳戶登入」畫面。
3. **訪客** 點擊登入，系統發起 Google OAuth。
4. **系統驗證**：
   - 如果 Email 不是 `@choco.media`，拒絕登入並提示錯誤。
   - 如果是合法的公司信箱，則在資料庫 `users` 建立/更新紀錄，核發 Session。
5. **已登入使用者** 進入系統預設首頁 (Dashboard)。
6. 取決於使用者的**角色權限 (Role)**：
   - 員工 (`employee`)：看到「首頁」、「給予回饋」、「我的報表」。
   - 主管 (`manager`)：額外看到「主管審核」。
   - 管理員 (`admin`)：額外看到「系統管理」。

## 權限與資料安全 (Supabase RLS)
- 唯有帶有合法 JWT (Google Issuer 轉換為 Supabase Session) 的 Request 才能讀寫資料庫。
- 任何人都可以讀取自己的 Profile (`id = auth.uid()`)。
- 任何人不得窺探他人的未公開 360 報表。

## 測試腳本索引
👉 `tests/e2e/auth.spec.ts`
