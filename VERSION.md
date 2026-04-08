# Choco360 System Blueprint - v1.6.0 (Stable)

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
- **AI**: Google Gemini 1.5 Flash (處理多維度情緒分析與成長建議)。

## 4. 系統路線圖 (Roadmap)
未來功能與安全性提案請參考 [TODO.md](file:///Users/abraham/Library/Mobile%20Documents/com~apple~CloudDocs/Antigravity%20Projects/Choco360/TODO.md).

## 5. 版本紀錄 (Changelog)

### v1.6.0 (2026-04-09)
- **主管中心、個人中心年份時間軸與 360 洞察整合**：
    - 🆕 **主管中心（我的團隊）**：主管可在 Approvals 直接瀏覽 direct reports 的 PRP 記錄與 360 洞察，三層 drill-down 導航（提名審核 / 我的團隊 → 成員詳情 → 各項詳細頁）。
    - 🆕 **個人中心年份時間軸**：整合原「我的報告」功能，以年份分群同時呈現 PRP 記錄卡片（琥珀色）與 360 洞察卡片（靛藍色），年份從提名標題 regex 萃取，確保正確分年。
    - 🆕 **360 洞察命名**：「成長報告」更名為「360 洞察」，定位更精準。
    - 📊 **Reports.tsx 擴充**：新增 `subjectUser` & `initialNominationId` props，支援主管嵌入式閱覽而不影響個人使用流程。
    - 🛠 **導覽精簡**：移除獨立「我的報告」側邊欄項目；「審核名單」→「主管中心」；Approvals 篩選 tab（待處理 / 歷史核准）改為分層顯示，與主要 tab 視覺上明確區隔。
    - 💬 **社群交流**：開發者留言板移至頁面上半部。
    - ✅ **測試**：Unit tests 42/42 通過；更新 `itemLabel` normalization 測試預期值。

### v1.5.0 (2026-04-03)
- **社群功能、超能力個人檔案、離職管理與報告優化**：
    - 🆕 **Community 社群功能**：新增 `Community.tsx` 社群互動頁面。
    - 🆕 **個人檔案超能力裝扮**：`Profile.tsx` 大幅更新，支援座右銘與光環個人化設定。
    - 🆕 **員工離職狀態管理**：API、提名流程與通知工作流均自動跳過已離職人員。
    - 📊 **Reports 報告 UI 重構**：新增 PDF 匯出功能、落差分析視覺化優化。
    - 🛡️ **管理員面板擴充**：新增離職員工管理功能。
    - 📋 **Dashboard 一鍵審核功能**：主管可於儀表板直接批准待審名單。
    - ✅ **測試覆蓋率大幅提升**：新增 admin、nomination、community 等 E2E 測試。

### v1.4.0 (2026-04-03)
- **持久化版本歷史與 UI 細節優化 (Persistent History & UI Polish)**：
    - **建立結構化數據源**：導入 `changelog.json` 作為版本歷史的單一事實來源，解決過往版本紀錄僅存在於文本、且隨對話消失的問題。
    - **新增 VersionHistory 互動組件**：實作側邊抽屜式 UI，讓所有使用者（IC/Manager/Admin）皆能隨時查看產品成長歷程與更新要點。
    - **側邊欄 UI 精簡化**：將原本顯眼的按鈕移至底部 Footer，整合「最後更新日期」並縮小版位，保留導覽列黃金空間供未來功能使用。
    - **行政控制中心清理**：移除冗餘的「系統資訊」分頁，將其與新版歷程 UI 整合，達成功能去重疊化。
    - **/release 工作流自動化**：更新本地 `.agent/workflows/release.md`，將維護 `changelog.json` 列為發布必經步驟，確保 AI 具備長期記憶。

### v1.3.2 (2026-04-03)
- **測試架構全面升級 (Full Test Coverage Upgrade)**：
    - **導入 Vitest 單元測試**：整合 Vitest 與 Istanbul (v8) 建立單元測試體系，針對 AI 分析、Slack 通知與 API 核心層進行 Mock 測試。
    - **覆蓋率自動化收集**：實現 Playwright (E2E) 與 Vitest (Unit) 的全專案覆蓋率監控，關鍵服務如 `geminiService` 與 `slackService` 分別達到 95% 與 91% 的高品質覆蓋。
    - **品質保障優化**：修復了 `updateUser` 等核心方法中的數個邊界邏輯錯誤。

### v1.3.1 (2026-03-25)
- **AI 分析功能修復**：修正 `geminiService.ts` 中的 AI 模型名稱，從不存在的 `gemini-2.5-flash` 還原為正常運作的 `gemini-1.5-flash`，恢復 AI 洞察分析功能。

### v1.3.0 (2026-03-24)
- **進度追蹤儀表板 (Progress Tracking)**：新增專屬的發起評鑑追蹤區塊，取代原有的頂部數據卡片。包含「收集中」、「主管審核中」、「已結案」三種動態狀態，並提供一鍵催繳與提醒捷徑。
- **UI/UX 優化**：當無任何待辦任務且無發起專案時，首頁自動轉為純淨的 Onboarding 流程引導畫面。

### v1.2.1 (2026-03-22)
- **Slack 互動體驗修復**：將所有 Slack 通知按鈕轉換為 Markdown 連結，解決使用者點擊時出現「未設定互動回應」的警告與 405 錯誤。
- **連結導向修正**：修正 Slack 通知中的連結邏輯，確保在任何環境下觸發的通知，其連結皆導向至正確的 Production App 網址，而非 localhost。

### v1.2.0 (2026-03-22)
- **登入機制全面重構 (Auth Migration)**：全面將純前端 Google 登入轉移至 Supabase Native OAuth，實現更安全的後端驗證，並優化 Session 狀態同步與連線錯誤處理機制，為未來實作 RLS (Row Level Security) 建立穩固基礎。
- **Slack 核心升級**：動態偵測運行環境 (localhost/production) 切換對應邏輯與網址；並分離通知日誌 UI。
- **通知管理優化**：重構 Slack 通知日誌介面，改以問卷主體（受評人與問卷名稱）進行群組化顯示，提昇系統監控效率，並引入主體列摺疊功能與相對時間顯示（如：1小時前）。
- **流程修復**：修復自動發送主管審核通知時，因 Email 欄位對應錯誤導致 DB Log 寫入失敗的 Bug。

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
