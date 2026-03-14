# 04. Nomination Flow

## 對應頁面與模組
- `components/Nomination.tsx` (員工提名頁面)
- `components/Approvals.tsx` (主管審核頁面)

## 使用者旅程 (User Journey)

### Part 1: 員工提名 (Employee Flow)
1. 進入**互評提名 (Nomination)** 頁面。
2. 員工需要選擇這次預計要互相評估的同仁 (預設需選 3~5 位)。
3. **防呆限制**：
   - 不能選擇自己。
   - (可選) 必須包含 1 位跨部門同仁。
4. 送出提名清單，清單狀態轉為 `Pending Approval`，等待直屬主管審核。
5. 在主管審核通過之前，員工不可開始填寫這幾個人的問卷。

### Part 2: 主管審核 (Manager Flow)
1. **直屬主管** 登入，進入 **主管審核 (Approvals)** 頁面。
2. 看到部屬提交的「提名清單」。
3. 點擊「查看名單」，主管可以：
   - **Approve (核准)**：確認這份名單無誤，雙方確實有業務往來。
   - **Reject (退回)**：認為名單不適合，附加退回理由後退給部屬重填。
   - **Modify (直接修改)**：主管直接幫部屬增刪名單。
4. 核准後，系統進入可填寫問卷階段。

## 測試腳本索引
👉 `tests/e2e/nomination.spec.ts`
