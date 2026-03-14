# 02. Admin Configuration

## 對應頁面與模組
- `components/AdminPanel.tsx`

## 使用者旅程 (User Journey)
1. 擁有 `admin` 權限的系統管理員，從側邊攔點擊「系統管理」。
2. **管理問卷 (Questionnaires)**：
   - 管理員可以點擊「新增問卷版本」。
   - 設定問卷名稱、描述、開始與結束時間，以及問卷內的「維度 (Dimensions)」與「題目 (Questions)」。
   - 一次只能有一個「Active」的問卷版本。
3. **管理員工 (Employees)**：
   - 管理員可以看到公司內所有的員工清單。
   - 點擊「編輯」可以開啟抽屜 (Drawer) 或 Modal。
   - 調整員工的「部門 (Department)」、「角色 (Role)」、「直屬主管 (Manager ID)」。
4. **全域監控 (Monitoring)**：
   - 管理員可查看全公司目前的 360 互評進度 (Completed / Pending)。
   - (可選) 強制介入特定員工的互評清單，進行調整。

## 測試腳本索引
👉 `tests/e2e/admin.spec.ts`
