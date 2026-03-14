# Choco360 核心政策規格 (Core Policy)

## 1. 身份認證 (Authentication)
- **網域約束**：系統僅允許以 `@choco.media` 結尾的 Google 帳號登入。
- **存取控制 (RBAC)**：
    - **System Admin**：具備「控制中心」權限，可管理全公司員工資料、問卷與全域監控。
    - **Manager**：當 `isManager` 標記為 true 時，具備「審核名單」入口。
    - **Individual Contributor (IC)**：具備提名、填寫與報告查閱權限。

## 2. 安全防護 (Security)
- **生產環境驗證**：所有登入必須經過 Google Identity Services (GIS) 進行 OAuth2 握手，禁止任何客戶端模擬登入指令。
- **Session 管理**：Email 將被存儲在 localStorage，但每次連線皆會與 Supabase `profiles` 表進行有效性校驗。

## 3. 資料庫 RLS 政策 (Row Level Security)
若在 Supabase 開啟 RLS，必須手動設定以下 Policy 始可維持應用程式運行：
- **Profiles 表**：
    - `SELECT`: 允許 `anon` 角色查詢（以便進行登入比對與顯示員工清單）。
    - `UPDATE`: 僅限管理員或該使用者本人（需結合 Auth 實作）。
- **Feedbacks 表**：
    - `INSERT`: 允許 `anon` 角色（需在應用層檢查是否有邀請）。
    - `SELECT`: 僅限受評人本人（需加密或結合 Auth）。

## 4. 未來架構演進：遷移至 Google Cloud (GCP)
若系統需求提升至企業合規級別，建議遷移至 Cloud SQL：
- **網路安全**：開啟 Private IP，透過 VPC Connector 實現 Cloud Run 與資料庫的內網互連。
- **認證安全**：使用 GCP Service Account 搭配 IAM Database Authentication，實現「無密碼」安全登入。
- **秘密管理**：敏感資訊（如 DB 帳密）必須存放在 Google Secret Manager。

## 5. 全域數據邏輯 (Data Logic)
- **有效分數定義**：評分為 `1` (不清楚/不適用) 的數據在所有平均值計算中必須被排除分母。
- **匿名機制**：報表中文字回饋絕對禁止顯示填寫者姓名，主管亦無法查看下屬被誰具體評論了什麼。