# Choco360 個人中心 Phase 1：PRP 整合與 Superpower 能力框架

## 背景

目前 Choco360 已具備完整的 360 同儕回饋流程（提名 → 填寫 → AI 報告），但缺少「主管考核 (PRP)」這一塊關鍵拼圖。主管的 PRP 評語目前存在於 Google Doc 中，沒有進入系統。Phase 1 的目標是：

1. 將 PRP 資料帶入系統 → 匯入/匯出 + 未來直接在線上填寫
2. 融合 PRP + 360 回饋 → 產出有意義的 Superpowers 與 Opportunities
3. 為此需要先建立「能力框架 (Competency Framework)」→ 依職種 × 職級定義期待

---

## 一、能力框架設計 (Competency Framework)

> [!IMPORTANT]
> **你的核心問題：「我要先定義各職種的能力嗎？要區分 Junior / Senior / Staff 嗎？」**
>
> **短回答：是的，但不需要從零開始，也不需要一次到位。** 以下是我建議的務實做法。

### 1.1 雙層能力模型 (Two-Layer Competency Model)

與其為每一個職種都寫一份獨立的能力清單，我建議採用「共通 + 專精」的雙層結構，這樣維護成本最低：

| 層級 | 名稱 | 適用對象 | 範例能力 |
|------|------|----------|----------|
| **Layer 1：共通能力 (Core Competencies)** | 所有職種皆適用 | PM, Designer, Dev, QA, CS, DE/DA | 溝通協作、問題解決、主動積極、指導他人、心理安全感 |
| **Layer 2：專精能力 (Role-Specific)** | 依職種不同 | 見下表 | 技術能力、設計思維、專案管理等 |

**Layer 2 各職種建議能力：**

| 職種 | 專精能力 1 | 專精能力 2 | 專精能力 3 |
|------|-----------|-----------|-----------|
| **PM** | 需求定義與優先級管理 | 利害關係人溝通 | 數據驅動決策 |
| **Designer** | 設計思維與用戶同理 | 視覺/互動品質 | 設計系統貢獻 |
| **Frontend Dev** | 前端架構與效能 | UI/UX 實作品質 | 可維護性與代碼品質 |
| **Backend Dev** | 系統設計與可擴展性 | API 品質與資料庫優化 | 可維護性與代碼品質 |
| **QA** | 測試策略與覆蓋率 | 自動化工程 | 品質倡導與流程改進 |
| **CS** | 客戶問題解決 | 知識管理與文件化 | 客戶洞察回饋 |
| **DE/DA** | 資料工程與管線品質 | 分析洞察力 | 資料治理 |

### 1.2 職級期待差異 (Level Expectations)

**關鍵設計決策：不是定義不同的「能力」，而是對同一能力有不同的「期待程度」。**

不需要替 Junior/Senior/Staff 各做一份能力清單。而是在同一個能力（例如「問題解決」）上，定義不同層級的行為描述 (Behavioral Indicators)：

| 能力 | Junior 期待 | Senior 期待 | Staff+ 期待 |
|------|------------|------------|-------------|
| 問題解決 | 能獨立解決已知類型的問題 | 能辨識根因並提出系統性解法 | 能預防問題發生，建立機制 |
| 指導他人 | 樂於分享知識 | 主動 Code Review 與 Pair | 建立團隊學習文化與機制 |

> [!TIP]
> **MVP 做法**：Phase 1 先只做 Layer 1（共通能力），用一套問卷打全部人。Layer 2（專精能力）可以做成 Admin 可配置的「能力資料庫」，後續再逐步擴展。職級期待可以先用文字描述即可，不需要建成結構化欄位。

### 1.3 系統實作方式

在 Admin Panel 新增一個「Competency Framework」管理頁面：

```
新建資料表: competencies
- id (UUID)
- name (TEXT) — e.g. "溝通協作"
- layer (TEXT) — 'core' | 'role_specific'
- applicable_roles (TEXT[]) — e.g. ['PM', 'Designer'] 或空代表全部
- level_expectations (JSONB) — { junior: "...", senior: "...", staff: "..." }
- created_at (TIMESTAMPTZ)
```

這張表由 Admin 維護，AI 在合成報告時會讀取此表作為「評量框架」，讓 Superpower 的產出有所依據。

---

## 二、PRP 匯入/匯出與在線填寫

### 2.1 資料模型

```sql
新建資料表: prp_records
- id (UUID)
- user_id (UUID, FK → profiles.id) — 被評的員工
- reviewer_id (UUID, FK → profiles.id) — 填寫PRP的人 (通常是主管)
- period (TEXT) — e.g. "2025-H2", "2026-Q1"
- self_contribution (TEXT) — 員工自述貢獻
- manager_comment (TEXT) — 主管評語
- rating (TEXT) — A/B/C/D
- raw_document (TEXT) — 原始 Google Doc 內容（匯入時保留）
- source (TEXT) — 'import' | 'in_system' 
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### 2.2 匯入流程 (Phase 1a - Import)

**使用者旅程：**
1. **Admin 批次匯入** 或 **員工自行匯入**，兩者都支援：
   - Admin 可在管理面板中，將 Google Doc 的內容以純文字或 Markdown 格式，貼入「匯入 PRP」介面。選擇對應員工、期間、評等。
   - 員工亦可在自己的個人中心裡，看到「匯入我的 PRP」按鈕，自行將 Google Doc 中的內容整理後貼入。
2. 匯入後的資料存入 `prp_records`，員工隨時可以在「個人中心 → My Impact」區塊回顧查看。
3. **匯出**：提供「下載為 Markdown / PDF」的功能，讓員工可以帶走自己的資料。

### 2.3 在線填寫 (Phase 1b - In-System PRP)

**未來迭代**，當團隊熟悉系統後：
1. 主管可在 Choco360 中直接為部屬撰寫 PRP（用結構化表單取代 Google Doc 的自由格式）。
2. 員工也在系統中填寫「自我貢獻總結」。
3. 填完後 `source = 'in_system'`，邏輯與匯入一致。

> [!NOTE]
> Phase 1a（匯入）和 Phase 1b（在線填寫）可以拆成兩個 Sprint。先上匯入讓大家把歷史資料帶進來，體驗到「一站式查閱」的價值。等到下一個考核週期，再讓大家直接在系統內寫。

---

## 三、AI 合成引擎 — 如何從 PRP + 360 產出 Superpowers & Opportunities

> [!IMPORTANT]
> **你的核心問題：「如何整合主管評語 + 同事評價，運算出有意義的 Superpowers 跟 Opportunity？」**

### 3.1 資料融合架構

目前 AI 只吃 360 回饋 (`feedbacks` + `feedback_responses`)。改版後，AI 的輸入將變成「三源合流」：

```
┌──────────────────────────────────────────────────────────┐
│                   AI Synthesis Engine                     │
│                                                          │
│  Input A: 360 同儕回饋                                     │
│  ├── 量化評分 (各維度平均分)                                  │
│  └── 質性文字 (start/stop/continue + 文字題)                │
│                                                          │
│  Input B: PRP 主管考核                                     │
│  ├── 主管評語 (manager_comment)                            │
│  ├── 員工自述 (self_contribution)                          │
│  └── 評等 (A/B/C/D)                                      │
│                                                          │
│  Input C: 能力框架 (Competency Framework)                   │
│  ├── 共通能力定義 (Core)                                    │
│  └── 該員工職種的專精能力定義 (Role-Specific)                  │
│                                                          │
│  ────────── AI Processing ──────────                     │
│                                                          │
│  Output:                                                 │
│  ├── Superpowers (最多 3 個，需要對應到能力框架)               │
│  ├── Opportunities (2-3 個需要加強的成長領域)                  │
│  ├── Year-in-Review Summary (年度總結)                     │
│  └── Recommended PDP Quests (建議的發展行動)                 │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Superpower 的「運算」邏輯

Superpower 不是簡單的數學計算，而是 **AI 結合結構化數據 + 文字脈絡的「推理」**。具體做法：

1. **量化訊號偵測**：在 360 回饋中，哪些維度的他評平均分 ≥ 4.0？這些就是候選 Superpower 的來源。
2. **質性驗證**：候選維度中，文字回饋是否有具體的正面行為描述作為佐證？（避免只因為分數高但沒有實質證據就封為 Superpower）
3. **主管角度疊加**：主管的 PRP 評語中是否也提到了相關的亮點？如果同儕覺得你溝通很強，主管也點名你在溝通上的貢獻，那這個 Superpower 的信心就更高。
4. **能力框架映射**：最終的 Superpower 必須能對應到能力框架中的某一項能力，讓它有「意義」而非單純的 AI 創作。

**Opportunity (成長領域) 的邏輯也類似，但反過來**：
- 360 分數偏低 (< 3.5) 的維度
- 主管的 PRP 評語中特別建議改進的面向
- 使用者自己的自我期待（如果有填）與現狀的落差

### 3.3 改版後的 Gemini Prompt 架構（概念）

```
[System Instruction]
你是一位矽谷專業 HR 指導教練。你正在為一位 {role} 職位的 {level} 員工，
產出年度成長總結。

能力框架 (Competency Framework):
- 共通能力：{core_competencies}
- 專精能力（{role}）：{role_specific_competencies}

[User Prompt]
--- 資料來源 1: 360 同儕回饋 ---
量化評分：{scores}
文字回饋：{open_ended_answers}

--- 資料來源 2: 主管績效評核 (PRP) ---
主管評語：{manager_comment}
員工自述貢獻：{self_contribution}
主管評等：{rating}

--- 請產出 ---
1. superpowers: 最多 3 個，必須對應到上方能力框架中的某項能力。
   每個需標注：title, mapped_competency, evidence_sources (哪些來源支持)
2. opportunities: 2-3 個需要加強的成長領域，同樣對應能力框架。
3. year_summary: 年度回顧總結（約 100 字）
4. recommended_quests: 3 個具體的發展行動建議
```

---

## 四、UI 設計 — 個人中心 (Profile) 新增「My Impact」區塊

在現有的 Profile.tsx 頁面中，新增一個 Tab 或區塊：

### 4.1 我的年度回顧 (My Impact)

```
┌─────────────────────────────────────────────┐
│  📊 我的年度回顧  |  期間: [2025-H2 ▾]       │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─── 🏢 主管考核 (PRP) ────────────────┐   │
│  │  評等: ⭐ B                           │   │
│  │  主管評語: "在專案 X 中展現了出色的..."  │   │
│  │  我的貢獻: "主導完成了 Y 模組的重構..."  │   │
│  │                    [匯入 PRP] [匯出 ↓]  │   │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─── 🤝 360 同儕回饋摘要 ─────────────┐   │
│  │  來自 5 位同事的回饋                    │   │
│  │  平均分數: 4.2 / 5.0                  │   │
│  │  最高維度: 溝通協作 (4.6)               │   │
│  │  最低維度: 技術深度 (3.8)               │   │
│  │                     [查看完整報告 →]    │   │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─── 🔮 AI 年度成長總結 ──────────────┐   │
│  │  "你在2025年展現了出色的跨團隊..."      │   │
│  │                                       │   │
│  │  ⚡ Superpowers:                       │   │
│  │  🟣 THE SYNERGY ARCHITECT (溝通協作)    │   │
│  │  🟢 THE QUALITY GUARDIAN (品質倡導)     │   │
│  │                                       │   │
│  │  🌱 Opportunities:                     │   │
│  │  📈 系統設計思維 — 嘗試主導架構設計      │   │
│  │  📈 技術深廣度 — 跨出舒適圈探索新領域    │   │
│  │                                       │   │
│  │               [生成 / 重新生成 AI 總結]  │   │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

---

## 五、開發排程建議

| Sprint | 工作項目 | 預估天數 | 依賴 |
|--------|---------|---------|------|
| **Sprint 1** | 能力框架資料表 + Admin UI (CRUD) | 2-3 天 | 無 |
| **Sprint 2** | PRP 資料表 + 匯入/匯出 UI (Admin + 個人) | 3-4 天 | 無 |
| **Sprint 3** | 個人中心「My Impact」UI 卡片呈現 | 2-3 天 | Sprint 2 |
| **Sprint 4** | AI 合成引擎改版 (三源合流 Prompt) | 2-3 天 | Sprint 1 + 2 |
| **Sprint 5** | E2E 測試 + 規格文件更新 | 1-2 天 | Sprint 3 + 4 |

> [!WARNING]
> Sprint 1 和 Sprint 2 可以平行進行，但 Sprint 4 (AI 整合) 必須等 Sprint 1 和 2 都完成後才能開始，因為 Prompt 需要引用能力框架和 PRP 資料。

---

## 開放問題 (Request for Review)

1. **能力框架的定義**：上面列出的共通能力與各職種專精能力，你覺得合理嗎？你們團隊有沒有現有的能力定義文件可以直接參考？
2. **職級 (Level)** 的來源：目前 `profiles` 表只有 `role` (職種) 沒有 `level` (職級)。你們是否有明確的 Junior / Senior / Staff 分級標準？需要加到 profiles 裡嗎？
3. **PRP 期間 (Period)**：你們的考核週期是半年制 (H1/H2) 還是年度制？這影響 `prp_records.period` 的格式。
4. **匯入格式優先級**：Phase 1 你偏好先做「純文字/Markdown 貼上」就好，還是需要支援 Google Doc API 直接串接？
5. **整體方向確認**：這樣的拆解與排序，是否符合你的預期？有哪些要調整？
