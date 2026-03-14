# Choco360 Slack 整合通知規格 (Slack Integration)

## 1. 核心機制
本系統透過 Slack Bot API 與企業 Workspace 整合，實現評鑑任務的即時提醒。

## 2. ID 對應邏輯 (Identity Mapping)
為了達成自動化標記 (@mention)，系統採用以下優先順序獲取 Slack ID：
1. **Database Cache**：檢查 `profiles.slack_id` 是否已有值。
2. **API Lookup**：若無快取，呼叫 Slack `users.lookupByEmail` 介面，以員工的 Google Email 查詢。
3. **Storage**：取得結果後，回填至 `profiles` 表格以減少後續 API 調用。
4. **Fallback**：若查無此人，則在訊息中使用該員工的姓名粗體字 (`*Name*`)，不進行 @標記。

## 3. 觸發事件與訊息規範 (Triggers & Visuals)

### 3.1 待審核提醒 (To Manager)
- **觸發點**：員工送出「提名邀請」時。
- **對象**：直屬主管。
- **內容**：告知有新的提名名單等待審核，附帶「前往審核」按鈕。

### 3.2 評鑑開始通知 (To Reviewers)
- **觸發點**：主管點擊「核准」後。
- **對象**：所有受邀的評鑑人 (Reviewers)。
- **內容**：
    - 標題：🔔 **您收到一份 360 度回饋邀請**
    - 內容： `<@SlackID>`，您的同事 `*RequesterName*` 邀請您為他提供專業回饋。
    - 截止日期：顯示格式化的 `YYYY-MM-DD`。
    - 行動：大型藍色按鈕 [ 立即填寫反饋 ]。

### 3.3 填寫完成通知 (To System/Admin)
- **觸發點**：每一筆回饋提交時。
- **對象**：指定的通知頻道 (#choco360-log)。
- **內容**：摘要進度，例如：「*Aaron* 已完成對 *Abraham* 的評鑑 (目前進度 3/8)」。

## 4. 安全與隱私
- **通知內容**：Slack 訊息中**不得**包含任何評鑑的具體評分或回饋文字。
- **Bot 權限**：僅需 `users:read.email` 與 `chat:write` 權限。

---
*最後更新日期：2025-03-05*