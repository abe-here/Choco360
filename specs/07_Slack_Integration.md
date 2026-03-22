# 07. Slack Notification System

## 對應頁面與模組
- `services/slackService.ts` (Slack API 溝通核心)
- `services/api.ts` (觸發點整合)
- `.env.local` / `.env.production` (環境變數配置)

## 功能需求 (Requirements)
為了提高 360 評量的執行效率與參與度，系統需整合 Slack 通知功能，確保關鍵流程節點能即時提醒相關人員。

### 1. 即時通知觸發點 (Notification Triggers)
- **提名待核准**：當員工送出提名邀請後，系統需發送私訊 (DM) 給該員工的主管。
- **評量任務提醒**：當主管核准提名後，系統需發送私訊給所有被指定的評量者 (Reviewers)。
- **回饋已送達**：當有人完成評量並送出回饋後，系統需發送私訊通知受評者人員。
- **定期催催 (Periodic Reminders)**：若問卷尚未截止且有人未填寫，每 1-5 天定期彙整未完成任務並發送提醒給評量者。

### 2. 核心體驗與開發階段限制
- **私訊優先**：所有通知應以 Slack Direct Message (DM) 形式發送。
- **開發階段保護 (Dev Bypass)**：在開發與測試階段，**所有通知一律只發送給 `abraham.chien@choco.media`**，即便邏輯上的接收者是其他人，以避免干擾一般同仁。
- **互動式卡片 (Block Kit)**：訊息應包含標題、內文提示，並附帶一個引導按鈕直達系統。

### 3. 技術限制與邊界 (Constraints)
- **Email 匹配**：系統透過 Choco360 的員工 Email 查找 Slack 帳號，兩者必須一致。
- **提醒頻率配置**：催催頻率需可透過環境變數 `VITE_SLACK_REMINDER_DAYS` 指定（例如：設定為 `3` 代表每 3 天提醒一次）。
- **靜默失敗 (Graceful Failure)**：若 Slack API 呼叫失敗或找不到對應帳號，系統應記錄 Log 但不可中斷主流程。

## 設計細節提案 (Design Proposal)

### 1. 架構定位
Slack 通知定位為 **「副作用 (Side Effect) 服務」**。
它不屬於任何單一頁面，而是橫跨多個使用者旅程的基礎建設。建議劃分為獨立的 `07. Slack Integration` 規格，並在 `api.ts` 的關鍵方法執行成功後異步調用。

### 2. 資料流設計 (Data Flow)
1.  **Trigger**: `api.saveNomination()` 或 `api.submitFeedback()` 執行成功。
2.  **Lookup**: 呼叫 `slackService.getUserIdByEmail(email)`。
3.  **Send**: 使用 `chat.postMessage` 並帶入 Block Kit JSON。

### 3. 配置管理
- 使用 `VITE_SLACK_BOT_TOKEN` 作為唯一金鑰。
- 使用 `VITE_SLACK_REMINDER_DAYS` 設定定期提醒天數。
- 支援 `VITE_SLACK_DEFAULT_CHANNEL` 作為系統警告或公用通知頻道（選配）。

## 目前實作現狀 (Current Implementation)

### 1. 訊息種類與內容 (Messages & Content)
系統目前實作了四種主要的 Slack 通知範本，皆使用 Slack **Block Kit** 構建互動式卡片：

| 通知類型 | 觸發點 | 關鍵內容 | 行動按鈕 |
| :--- | :--- | :--- | :--- |
| **提名待核准** | `api.saveNomination()` | `requesterName` 提交了評量週期 `title` | 前往核准 |
| **新評量任務** | `api.updateNomination()` (Status -> Approved) | `requesterName` 邀請您在 `title` 提供回饋 | 開始填寫 |
| **收到新回饋** | `api.submitFeedback()` | 您在 `title` 週期收到了一筆新的同事回饋 | 查看報告 |
| **待處理統整提醒** | `AdminPanel.tsx` 活動監控面板上的按鈕 | 統整未完成的任務清單與數量 | 前往 Dashboard |

### 2. 觸發邏輯與資料庫紀錄 (Logic & DB Logging)
*   **即時觸發與紀錄 (Real-time & DB Auto-Log)**：整合於 `services/api.ts` 的 CRUD 操作中，送出邀請、審核通過、收到回饋時會自動觸發 Slack 通知，並且一併將通知摘要與狀態寫入 Supabase `notification_logs` 資料表中。
*   **手動批次提醒 (Manual Batch Reminders)**：為了提供更高的行政管理彈性，全局的任務催繳（Pending Tasks）現在改由管理後台的「活動監控」頁面手動點擊「發送待處理統整提醒」觸發。發送紀錄同樣會被寫入 `notification_logs`。
*   **通知管理中心 (Notification Management)**：管理員在後台的「通知管理」選項可瀏覽所有發出過的通知日誌，並支援單筆「重新發送」與「清空歷史紀錄」的功能。

### 3. 開發階段限制 (Current Constraints)
*   **開發保護 (Dev Bypass)**：目前 `services/slackService.ts` 中實作了強制轉發邏輯。**不論原始接收者是誰，所有訊息一律發送至 `abraham.chien@choco.media`**。
*   **隱身失敗**：若 Slack API 調用失敗，系統會於 Console 記錄 Warn/Error，但不會中斷前端 UI 流程。

## 測試與驗證 (Verification)
👉 `tests/e2e/nomination.spec.ts` (驗證流程中通知代碼是否正確觸發且不報錯)
👉 手動測試：觀察真實 Slack 帳號是否收到私訊。
