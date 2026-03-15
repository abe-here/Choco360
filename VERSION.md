# Nexus360 System Blueprint - v1.1.0 (Stable)

## 1. 系統定位
Nexus360 是專為 **CHOCO Media Group** 打造的 360 度員工互評系統，旨在透過數據與 AI 驅動組織成長文化。

## 2. 核心功能規格
### A. 認證機制
- **網域限制**：僅限 `@choco.media` 員工登入。
- **管理權限**：`abraham.chien@choco.media` 預設為最高權限 System Admin。
- **角色區分**：分為 Admin (系統管理)、Manager (名單審核)、IC (一般員工)。

### B. 互評流程
1. **提名階段**：員工主動邀請同事（上限 8 人），選擇對應問卷。
2. **審核階段**：直屬主管收到通知，可批准或修改受邀人名單。
3. **填寫階段**：受邀人使用 SSC 模型（Stop/Start/Continue）與五大維度評分填寫回饋。
4. **分析階段**：Gemini 3 Pro 分析質性文字與量化數據，產出發展計畫。

### C. 五大評鑑維度
1. **團隊協作與心理安全感**
2. **產品思維**
3. **當責精神與成果導向**
4. **工匠精神與追根究底**
5. **學習精神與知識分享**

## 3. 技術堆疊
- **Frontend**: React 19, Tailwind CSS, Recharts (雷達圖)。
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)。
- **AI**: Google Gemini 3 Pro (處理多維度情緒分析與成長建議)。

## 4. 系統路線圖 (Roadmap)
未來功能與安全性提案請參考 [TODO.md](file:///Users/abraham/Library/Mobile%20Documents/com~apple~CloudDocs/Antigravity%20Projects/Choco360/TODO.md)。

## 5. 版本紀錄 (Changelog)

### v1.1.0 (2026-03-15)
- **Slack 整合**：恢復為自動定期提醒機制，移除後台手動觸發按鈕，確保流程自動化。
- **AI Growth Coach**：修復 AI 建議生成異常，最佳化 JSON 拆解邏輯，提升回饋品質。
- **測試覆蓋率**：新增多項 Playwright E2E 測試，涵蓋儀表板、個人設定、提名流程與分析報告。
- **安全性與規格**：更新 `.env.example` 並補全實體規格文件 `07_Slack_Integration.md`。

### v1.0.0 (2026-03-15)
- **基礎架構**：實作基礎 CRUD 與狀態管理。
- **認證**：整合 Google 企業信箱登入 (SSO)。
- **AI 報告**：Google Gemini 3 Pro AI 報告生成模組上線。
- **測試**：引入 TDD 架構與 Playwright E2E 測試。
- **安全性**：強化 Auth Edge Cases 與環境變數設定。

---
*註：發佈新版本時，請遵循 [release.md](file:///Users/abraham/Library/Mobile%20Documents/com~apple~CloudDocs/Antigravity%20Projects/Choco360/.agent/workflows/release.md) 流程更新此區塊。*
