# Choco360 個人中心 Phase 1：PRP 整合與 AI 成長總結（v4 — 真實數據驗證版）

## 背景

v3 版計畫的架構方向已獲確認。本次更新基於 **Mark Fang 的完整雙面真實資料**（PRP + 360 報告）進行模擬分析，驗證 AI 合成引擎的設計，並根據發現的洞察調整計畫。

---

## 一、真實數據交叉分析模擬

### 1.1 資料匯總

**360 同儕回饋（6 位回饋者）：**

| 維度 | 自評 | 他評 | 落差 | 子題亮點 | 子題警訊 |
|------|-----|------|------|---------|---------|
| Team Work 與協作 | 4.8 | 4.2 | -0.6 | 補位 **4.8** 🔥 | 溝通品質 **3.9** ⚠️ |
| 產品思維 | 3.7 | **4.4** | **+0.7** 🟢 | 知其所以然 **4.7** 🔥 | — |
| 當責精神與成果導向 | 5.0 | 4.4 | -0.6 | 解決阻礙 **4.8** 🔥 | — |
| 工匠精神與追根究底 | 4.3 | 4.2 | -0.1 | 技術債管理 4.5 | 成果品質 **3.5** ⚠️ |
| 學習精神 | 4.5 | 4.4 | -0.1 | 擁抱變化 **4.6** | — |

**PRP 主管考核（等第 A）：**

| 項目 | 類型 | 重要度 | 原主管分數 | 新主管分數 | 關鍵主管評語 |
|------|------|--------|-----------|-----------|-------------|
| KPI 1 (Infra 整併) | KPI | ★★★ | 84 | 84 | 「負責任的態度，讓產品平穩運作」 |
| KPI 2 (營收報表) | KPI | ★★☆ | 89 | **82** ⚠️ | 新主管：「期待用 AI 解放雙手」 |
| KPI 3 (一鍵上架) | KPI | ★★☆ | 89 | 89 | 「展現產品思維，主動找使用者」 |
| 團隊合作 | 核心職能 | ★★☆ | 85 | **88** | 「最正向的人，具備 Leadership 潛力」 |
| 追求卓越 | 核心職能 | ★★★ | 85 | 85 | 「追求 Done → Achieved」 |

### 1.2 交叉驗證 — 逐維度分析

#### ⚡ Superpower 候選 1：產品思維 — 最強訊號

| 來源 | 訊號 | 信心 |
|------|------|------|
| 360 他評 | **4.4**（全維度最高）, 知其所以然 **4.7** | 🟢 強 |
| 360 落差 | **+0.7**（同儕比自己評得更高 — 罕見且珍貴的訊號，代表真正的低調實力）| 🟢 強 |
| 360 質性 | 「從操作者角度思考」「提出新奇想法刺激團隊思考」 | 🟢 強 |
| PRP | KPI 3 拿到 89 分，主管用「產品思維」一詞 | 🟢 強 |
| **結論** | **4/4 來源交叉驗證 → HIGH confidence Superpower** | ⚡ |

> 建議稱號：**THE PRODUCT COMPASS** — 「在團隊做什麼之前，先問為什麼」

#### ⚡ Superpower 候選 2：Team Work — 補位與安全感

| 來源 | 訊號 | 信心 |
|------|------|------|
| 360 他評 | 補位 **4.8**（全部子題最高分）, 心理安全感 4.0 | 🟢 強 |
| 360 質性 | 「與他合作有安全感」「隨時可以找他幫忙」「暖陽」 | 🟢 強 |
| PRP | 團隊合作 85-88 分，「最正向的人，影響周遭」 | 🟢 強 |
| **結論** | **3/3 來源交叉驗證 → HIGH confidence Superpower** | ⚡ |

> 建議稱號：**THE SAFETY NET** — 「在緊急時刻主動接住隊友」

#### ⚡ Superpower 候選 3：當責精神 — 解決阻礙

| 來源 | 訊號 | 信心 |
|------|------|------|
| 360 他評 | 解決阻礙 **4.8**, 交付價值 4.3 | 🟢 強 |
| PRP | KPI 1 Infra 整併成功, 追求卓越 85 分 | 🟢 中 |
| 360 落差 | -0.6（自評 5.0 vs 他評 4.4 — 自我期待高）| 🟡 注意 |
| **結論** | **有佐證但落差需提醒 → MEDIUM-HIGH Superpower** | ⚡ |

> 建議稱號：**THE BLOCKER BREAKER** — 「不會雙手一攤等待，而是積極推進」

#### 🌱 Opportunity 1：溝通品質與情緒節奏

| 來源 | 訊號 | 嚴重度 |
|------|------|--------|
| 360 量化 | 溝通品質 **3.9**（Team Work 維度最低子題）| ⚠️ 中 |
| 360 Stop | 「不分場合嘻笑」「說教感」「情緒帶動節奏過急」「投射自我觀點」 | ⚠️ 中高 |
| 360 Start | 「先了解對方需求」「降低對方防禦心」 | 建議 |
| PRP | 無負面提及（主管反而說正向）| — |
| **結論** | **360 有清楚訊號但 PRP 未提及 → 同儕獨有視角，非常有價值** | 🌱 |

> 這正是 360 回饋的核心價值 — 主管看不到的盲點，同儕看得到。

#### 🌱 Opportunity 2：成果品質（可讀性與可維護性）

| 來源 | 訊號 | 嚴重度 |
|------|------|--------|
| 360 量化 | 成果品質 **3.5**（工匠精神維度最低，全 15 題中倒數第二）| ⚠️ 中 |
| 360 其他 | 根因分析 4.3、技術債 4.5（這兩項不錯）| 🟢 |
| PRP | 未直接提及 | — |
| **結論** | **程式碼/文件的可讀性是一個具體可改善的面向** | 🌱 |

#### 🌱 Opportunity 3：工作模式優化（來自 PRP 獨有訊號）

| 來源 | 訊號 | 嚴重度 |
|------|------|--------|
| PRP | KPI 2 新主管 82 分（全部 KPI 最低），明確建議「利用 AI 將執行移轉回需求端」 | ⚠️ 中 |
| 360 | 未提及 | — |
| **結論** | **PRP 獨有視角 — 主管看到的戰略層面建議** | 🌱 |

---

## 二、模擬分析的關鍵發現 → 計畫需要更新的地方

> [!IMPORTANT]
> 以下 3 個發現，是我用真實數據跑過之後才意識到的，需要回頭調整 AI 合成引擎的設計。

### 發現 1：子題粒度 (Sub-question Granularity) 至關重要

原本我設計的是「維度層級」的分析（例如「Team Work 他評 4.2」）。但真實數據告訴我：

**同一個維度內，子題分數可以差距極大。**
- Team Work：補位 **4.8** vs 溝通品質 **3.9** — 差了快 1 分！
- 工匠精神：技術債 4.5 vs 成果品質 **3.5** — 差了 1 分！

如果只看維度平均 4.2，就會完全漏掉「溝通品質偏弱」和「成果可讀性待加強」的訊號。

**→ 計畫更新：AI Prompt 必須包含子題層級的分數，不能只給維度平均。**

### 發現 2：自評 vs 他評落差 (Self-Peer Gap) 是第一等級的訊號

| 落差類型 | 代表意義 | Mark 的例子 |
|---------|---------|------------|
| **他評 > 自評** (正向落差) | 低調實力，同儕認可但自己低估 | 產品思維 **+0.7** → 最強 Superpower 訊號 |
| **自評 > 他評** (負向落差) | 自我期待高，或盲點 | 當責精神 **-0.6**, Team Work **-0.6** |
| **落差 ≈ 0** | 自我認知準確 | 工匠精神 -0.1, 學習精神 -0.1 |

**→ 計畫更新：AI 的 Output 應該包含 `self_peer_gap_insight` — 對落差的專門解讀。** 這個資訊在 PDP（發展計畫）中極為重要：落差讓你知道「你以為的自己」和「別人看到的你」之間的距離。

### 發現 3：PRP 與 360 的「分歧」本身就是最有價值的資訊

| 面向 | PRP 主管看到的 | 360 同儕看到的 | 分歧解讀 |
|------|--------------|--------------|---------|
| 溝通/正向性 | 「最正向的人」(純正面) | 「說教感」「過急」「投射觀點」(有負面) | 🔴 **高價值分歧**：主管看到的是正面影響力，同儕感受到的是過度的推力 |
| 成果品質 | 未提及 | 3.5 分 (偏低) | 🟡 主管關注產出結果，同儕關注過程品質 |
| 產品思維 | KPI 3 高度肯定 | 4.4 (最高維度) | 🟢 **共識**：雙方一致認可 |

**→ 計畫更新：AI 的 Output 應該新增 `divergence_alerts` 欄位 — 當 PRP 和 360 在同一面向出現顯著分歧時，主動標記並解讀。** 這是整個「合成」的最大價值所在。

---

## 三、更新後的 AI 合成引擎設計

### 3.1 更新後的 Gemini Prompt

```
[System Instruction]
你是一位矽谷等級的 HR 成長教練，正在為一位 {job_title} 員工綜合分析
「主管績效考核 (PRP)」與「同儕 360 回饋」的雙面數據，產出年度成長報告。

本團隊的 360 回饋使用以下維度與子題：
1. Team Work 與協作
   目標：創造安全感與高效協作
   - 1.1 [心理安全感] ...
   - 1.2 [溝通品質] ...
   - 1.3 [團隊補位] ...
   - 1.4 [給予回饋] ...
2. 產品思維 (Product Mindset)
   目標：從接單生產升級為解決商業問題
   - 2.1 [知其所以然] ...
   - 2.2 [數據與用戶意識] ...
   - 2.3 [避免過度設計] ...
3. 當責精神與成果導向
   ...（完整 15 題行為描述）
4. 工匠精神與追根究底
   ...
5. 學習精神
   ...

分析原則：
- 以上述維度為「共通語言」，將 PRP 的核心職能與 KPI 映射到這些維度上
- 分析必須深入到「子題層級」，不要停留在維度平均
- 特別關注「自評 vs 他評落差」和「PRP vs 360 的分歧」

[User Prompt]
═══ 360 同儕回饋 ═══
【維度量化分數（含子題）】
{foreach dimension:}
  - {dimension.name} (自評均: {selfAvg}, 他評均: {peerAvg}, 落差: {gap})
    {foreach sub-question:}
    - {question.text}: 自評 {selfScore}, 他評均 {peerAvg}

【Stop / Start / Continue 質性回饋】
Stop: {stop_comments}
Start: {start_comments}  
Continue: {continue_comments}

【AI 既有分析摘要（如果有）】
{existing_ai_analysis.summary}

═══ 主管績效考核 (PRP) ═══
【KPI 項目】
{foreach KPI: 標題, 自述, 重要度, 各主管評語+分數}

【核心職能】
{foreach competency: 類別名, 自述, 各主管評語+分數}

【綜合考核】{overall_comments}
【最終等第】{rating}

═══ 請輸出 JSON ═══
{見下方 Output Schema}
```

### 3.2 更新後的 Output Schema

```typescript
interface YearInReview {
  // 年度總結
  year_summary: string;  // 約 200 字
  
  // Superpowers (≤3)
  superpowers: Array<{
    title: string;           // e.g. "THE PRODUCT COMPASS"
    category: 'strategic' | 'support' | 'leadership';
    mapped_dimension: string; // 對應到哪個 360 維度
    mapped_sub_item: string;  // 對應到哪個子題 (新增!)
    evidence: {
      from_360: string;       // 360 中的佐證
      from_prp: string;       // PRP 中的佐證
    };
    confidence: 'high' | 'medium';
  }>;
  
  // Opportunities (2~3)
  opportunities: Array<{
    area: string;
    mapped_dimension: string;
    evidence: {
      from_360: string;
      from_prp: string;
    };
    suggested_action: string;
  }>;
  
  // 🆕 自評落差洞察
  self_peer_gap_insight: string;
  // e.g. "你在產品思維上低估了自己（自評3.7 vs 他評4.4），
  //  這代表同儕非常認可你問Why的能力。反之，你在當責精神上
  //  自我期待很高（自評5.0 vs 他評4.4），這份高標準是好事，
  //  但也要留意是否因此對他人有隱性壓力。"
  
  // 🆕 PRP-360 分歧警報
  divergence_alerts: Array<{
    topic: string;            // e.g. "溝通風格"
    prp_perspective: string;  // 主管看到什麼
    peer_perspective: string; // 同儕看到什麼
    interpretation: string;   // AI 的解讀
  }>;
  
  // 建議的發展行動
  recommended_quests: Array<{
    title: string;
    description: string;
    linked_opportunity: string; // 對應到哪個 opportunity
  }>;
}
```

### 3.3 模擬 Mark 的完整 AI 輸出

```json
{
  "year_summary": "Mark 在 2025 年展現了'問Why'的產品思維與'接住隊友'的團隊力量，兩項能力獲得主管與同儕雙重認證，為合併期間的穩定運作做出關鍵貢獻。下一步應聚焦溝通節奏的精煉——將強大的推動力轉化為更容易被接收的影響力——並探索自動化策略將精力集中在高價值課題上。",
  
  "superpowers": [
    {
      "title": "THE PRODUCT COMPASS",
      "category": "strategic",
      "mapped_dimension": "產品思維",
      "mapped_sub_item": "知其所以然 (4.7)",
      "evidence": {
        "from_360": "他評 4.4（全維度最高），正向落差 +0.7，同儕：「從操作者角度思考、提出新奇想法刺激團隊」",
        "from_prp": "KPI 3 雙主管 89 分，明確使用「產品思維」一詞肯定"
      },
      "confidence": "high"
    },
    {
      "title": "THE SAFETY NET",
      "category": "support",
      "mapped_dimension": "Team Work 與協作",
      "mapped_sub_item": "團隊補位 (4.8)",
      "evidence": {
        "from_360": "補位 4.8（全部子題最高），Continue：「與他合作有安全感」「隨時可以找他幫忙」",
        "from_prp": "團隊合作 85-88 分，新主管：「是我見過最正向的人，具備 Leadership 潛力」"
      },
      "confidence": "high"
    },
    {
      "title": "THE BLOCKER BREAKER",
      "category": "leadership",
      "mapped_dimension": "當責精神與成果導向",
      "mapped_sub_item": "解決阻礙 (4.8)",
      "evidence": {
        "from_360": "解決阻礙 4.8，同儕：「勇於面對問題」",
        "from_prp": "KPI 1 確保產品平穩運作，綜合考核：「追求 Done → Achieved」"
      },
      "confidence": "medium"
    }
  ],
  
  "opportunities": [
    {
      "area": "溝通節奏與雙向傾聽",
      "mapped_dimension": "Team Work 與協作 → 溝通品質 (3.9)",
      "evidence": {
        "from_360": "溝通品質 3.9（Team Work 最低），Stop：「說教感」「情緒過急」「投射自我觀點」「直爽與修飾非互斥」",
        "from_prp": "（主管未提及，這是同儕獨有的視角）"
      },
      "suggested_action": "在關鍵討論中練習「先確認對方接收狀態，再投放意見」。每次想推動事情時，先讓對方說完再提解法。"
    },
    {
      "area": "成果可讀性與可維護性",
      "mapped_dimension": "工匠精神 → 成果品質 (3.5)",
      "evidence": {
        "from_360": "成果品質 3.5（全部子題倒數第二），而根因分析 4.3、技術債 4.5 都不錯",
        "from_prp": "（未提及）"
      },
      "suggested_action": "對交付的程式碼與文件做一次'可讀性回顧'，嘗試讓它像一篇「寫給別人看的文章」。"
    },
    {
      "area": "工作模式優化與戰略聚焦",
      "mapped_dimension": "學習精神 → 擁抱變化",
      "evidence": {
        "from_360": "（未提及）",
        "from_prp": "KPI 2 新主管 82 分（最低KPI），明確建議：「利用 AI 將執行移轉回需求端，解放雙手做更有價值的事」"
      },
      "suggested_action": "評估營收報表流程的自動化可能性，目標是將每月維運時間減半。"
    }
  ],
  
  "self_peer_gap_insight": "你在「產品思維」上低估了自己（自評 3.7 vs 他評 4.4，差距 +0.7）。同儕比你自己更認可你『問 Why』的能力，這是真正的低調實力，請擁抱這份認可。反之，你在「當責精神」和「Team Work」上自評都比他評高 0.6 分。這份高自我標準是驅動力，但也要留意是否因此對他人產生隱性壓力——這可能與同儕提及的『節奏過急』有關。",
  
  "divergence_alerts": [
    {
      "topic": "溝通風格 — 正向力量 vs 推力過強",
      "prp_perspective": "主管看到的是純正面：「最正向的人，影響周遭，能和緩緊張氣氛，具備 Leadership 潛力」",
      "peer_perspective": "同儕感受到的是雙面：既欣賞正向能量，又覺得「過急」「說教感」「過於投射自我觀點」",
      "interpretation": "主管從結果面看到了正向影響力，但同儕從日常互動面感受到推力過強。你的正向特質是真實的，但『傳遞方式的精煉度』是你從 Senior 走向 Staff/Lead 的關鍵修煉。"
    }
  ],
  
  "recommended_quests": [
    {
      "title": "影響力修煉：傾聽先於表達",
      "description": "每週選擇一次重要討論，刻意練習「先讓對方完整表達 → 確認理解 → 再提出自己的觀點」。一個月後請一位信任的同事給你回饋。",
      "linked_opportunity": "溝通節奏與雙向傾聽"
    },
    {
      "title": "Code as Documentation：代碼可讀性提升計畫",
      "description": "挑選一個即將交付的模組，實踐「寫給六個月後的自己看」原則。完成後邀請一位同儕做 Readability Review（非 correctness review）。",
      "linked_opportunity": "成果可讀性與可維護性"
    },
    {
      "title": "營收報表自動化 PoC",
      "description": "用兩週時間評估營收報表流程中哪些步驟可以用工具或 AI 替代，產出一份 Feasibility Doc 並與主管對齊。",
      "linked_opportunity": "工作模式優化與戰略聚焦"
    }
  ]
}
```

---

## 四、計畫更新摘要

相較 v3 版，以下 3 點需要調整：

### 更新 1：AI 的輸入粒度 — 必須包含子題分數

v3 的設計只餵「維度平均」給 AI，現在改為餵「每一題的自評分 + 他評平均」。

**影響範圍：**
- `geminiService.ts` 的 Prompt 需要包含 15 題的個別分數。
- 這些資料已經存在 `feedback_responses` 中，不需要新增 DB 欄位。

### 更新 2：AI 的輸出增加兩個新欄位

| 新欄位 | 用途 | UI 呈現 |
|--------|------|---------|
| `self_peer_gap_insight` | 解讀自評與他評的落差模式 | 個人中心的「自我認知鏡」卡片 |
| `divergence_alerts` | 標記 PRP 與 360 的分歧 | 高亮的「⚠️ 多視角分歧」警報卡片 |

### 更新 3：Stop/Start/Continue 必須進入 AI Prompt

v3 版漏掉了這塊。360 的 Stop/Start/Continue 開放式回饋包含了**分數無法捕捉的行為細節**（「說教感」「情緒過急」等），這些是 Opportunity 判定的最關鍵證據。

**影響範圍：**
- `feedbacks` 表已有 `stop_comments`, `start_comments`, `continue_comments` 欄位。
- 需要將這些文字（匿名化後）加入 AI Prompt。

---

## 五、最終開發排程

| Sprint | 工作項目 | 預估天數 |
|--------|---------|---------|
| **Sprint 1** | DB: `prp_records` + `prp_items` 資料表建立 | 0.5 天 |
| **Sprint 2** | PRP 匯入 UI (上傳 .md → Gemini 解析 → 預覽確認 → 儲存) | 3-4 天 |
| **Sprint 3** | 個人中心「My Impact」PRP 查看 + 匯出 | 2-3 天 |
| **Sprint 4** | AI 合成引擎改版 (三源合流 + 子題粒度 + 落差分析 + 分歧警報) | 3-4 天 |
| **Sprint 5** | AI 年度成長總結 UI (Superpower + Opportunity + Gap Insight + Divergence) | 2-3 天 |
| **Sprint 6** | E2E 測試 + 規格文件更新 | 1-2 天 |

**總計：約 12-17 天**

---

## 開放問題 (Request for Review)

1. **模擬結果感覺如何？** Mark 的那段模擬 JSON 輸出，如果手機或電腦上看到這樣一份報告，你覺得它有沒有做到你期望的「洞察感」？

2. **分歧警報 (Divergence Alert)** 你覺得這個功能對團隊有幫助嗎？它可能會讓員工意識到「主管看到的我」和「同儕看到的我」是不同的，這種衝擊對你的團隊文化是正面的嗎？

3. **隱私考量**：Stop/Start/Continue 的文字是匿名的，但放進 AI Prompt 後會影響 Superpower 和 Opportunity 的判定。你 OK 嗎？

4. **整體計畫是否可以定案** 進入實作了？如果是，我下一步會建立正式的 task.md 開始拆 Ticket。
