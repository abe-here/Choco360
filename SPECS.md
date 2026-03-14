# Choco360 系統總體規格索引 (Project Index)

本系統採模組化規格設計。根目錄下的本文件作為導覽索引，詳細邏輯請參閱 `specs/` 目錄下之子文件。

## 📖 規格模組導覽
1.  **[核心政策與認證](./specs/01_Core_Policy.md)**
    *   定義 Google 登入、網域限制與全域數據演算法。
2.  **[員工管理與組織架構](./specs/02_Employee_Mgmt.md)** (Updated)
    *   定義 6 大部門、10 大角色以及員工編輯抽屜行為。
3.  **[問卷設計與版本庫](./specs/03_Form_Design.md)**
    *   定義問卷維度、題目編輯與版本鎖定邏輯。
4.  **[活動監控與行政介入](./specs/04_Monitoring.md)**
    *   定義全域進度追蹤、主管審核與管理員強制介入權限。
5.  **[個人報告與 AI 分析](./specs/05_Reports_AI.md)**
    *   定義雷達圖視覺規範與 Gemini AI 教練分析 Prompt。

---
## 🛠️ 技術實作摘要
- **Frontend**: React 19 + Tailwind CSS + Manual SVG Radar.
- **Backend**: Supabase (PostgreSQL RLS).
- **AI Engine**: Gemini 3 Pro (JSON Mode).

---
*最後更新日期：2025-03-05*
*系統版本：v2.8 (Full Module Specs)*