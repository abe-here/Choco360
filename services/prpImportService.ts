import { GoogleGenAI, Type } from "@google/genai";
import { PRPItem } from "../types";

export interface PRPEvaluationEntry {
  label: string;        // "原主管" | "核准主管" | "新主管" | "部門主管"
  comment: string;      // 評語文字，空字串代表無內容
  score: number | null; // 數字分數，無則為 null
}

export interface ParsedPRPItem {
  itemType: 'kpi' | 'core_competency';
  itemLabel: string;               // 有意義的標題，不可為空
  importance: number | null;       // 1–3，無則為 null
  selfDescription: string;         // 員工自述，空字串代表無內容
  evaluations: PRPEvaluationEntry[];
  itemRating: 'S' | 'A' | 'B' | 'C' | 'D' | null; // 個別等第
  averageScore: number | null;     // 表格「平均」欄數字，無則為 null
}

export interface ParsedPRP {
  period: string;         // 純年份，如 "2025"
  name: string;           // 員工姓名
  department: string;     // 部門
  employeeCode: string;   // 員編
  jobTitle: string;       // 職稱
  overallSelfSummary: string;
  finalRating: 'S' | 'A' | 'B' | 'C' | 'D' | null;
  items: ParsedPRPItem[];
  overallManagerComments: { label: string; comment: string; score: number | null }[];
}

// ── Normalization ──────────────────────────────────────────────────────────
// 將 AI 的原始輸出標準化為 ParsedPRP，修正所有已知的不穩定輸出模式。

const VALID_RATINGS = new Set(['S', 'A', 'B', 'C', 'D']);

function normalizeRating(raw: any): 'S' | 'A' | 'B' | 'C' | 'D' | null {
  if (!raw) return null;
  const v = String(raw).trim().toUpperCase().replace(/[^SABCD]/g, '');
  return VALID_RATINGS.has(v) ? v as any : null;
}

function normalizePeriod(raw: any): string {
  if (!raw) return '';
  // 擷取四位數年份，去除 "年"、"年度" 等後綴
  const match = String(raw).match(/\d{4}/);
  return match ? match[0] : String(raw).trim();
}

function normalizeItemType(raw: any): 'kpi' | 'core_competency' {
  if (!raw) return 'kpi';
  const v = String(raw).toLowerCase().trim();
  if (v === 'kpi' || v.includes('kpi')) return 'kpi';
  if (v.includes('core') || v.includes('competency') || v.includes('核心') || v.includes('職能')) return 'core_competency';
  return 'kpi';
}

function normalizeScore(raw: any): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return isNaN(n) ? null : n;
}

function normalizeString(raw: any): string {
  if (raw === null || raw === undefined) return '';
  return String(raw).trim();
}

function normalizeEvaluations(raw: any): PRPEvaluationEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e: any) => e && normalizeString(e.label))
    .map((e: any) => ({
      label: normalizeString(e.label),
      comment: normalizeString(e.comment),
      score: normalizeScore(e.score),
    }));
}

function normalizeItems(raw: any): ParsedPRPItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any, idx: number) => {
    const label = normalizeString(item.itemLabel);
    const desc = normalizeString(item.selfDescription);
    // 若 label 仍是通用標籤（如 "KPI", "KPI 1", "核心職能"），用 selfDescription 首句替代
    const isGenericLabel = !label || /^(kpi\s*\d*|核心職能\s*\d*|competency\s*\d*)$/i.test(label);
    let fallbackLabel = isGenericLabel
      ? (desc.split('\n')[0].replace(/^[•\-\d.]+\s*/, '').trim().slice(0, 30) || `項目 ${idx + 1}`)
      : label;

    // 清除 [KPI] / [核心職能] 前綴，以及 ": 目標：" 等說明性後綴（劉金梅格式）
    fallbackLabel = fallbackLabel
      .replace(/^\[(kpi|核心職能|core_competency)\]\s*/i, '')
      .replace(/[:：]\s*(目標|指標|說明).*$/i, '')
      .trim() || `項目 ${idx + 1}`;

    return {
      itemType: normalizeItemType(item.itemType),
      itemLabel: fallbackLabel,
      importance: item.importance != null ? normalizeScore(item.importance) : null,
      selfDescription: desc,
      evaluations: normalizeEvaluations(item.evaluations),
      itemRating: normalizeRating(item.itemRating),
      averageScore: normalizeScore(item.averageScore ?? item.average ?? null),
    };
  });
}

function normalizeManagerComments(raw: any): { label: string; comment: string; score: number | null }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    // 只要 label 非空就保留（comment 可空、score 可 null，避免遺失核准主管整體分數）
    .filter((c: any) => c && normalizeString(c.label))
    .map((c: any) => ({
      label: normalizeString(c.label),
      comment: normalizeString(c.comment),
      score: normalizeScore(c.score ?? null),
    }));
}

function normalizePRPOutput(raw: any): ParsedPRP {
  const items = normalizeItems(raw.items);
  let finalRating = normalizeRating(raw.finalRating);

  // 兜底：若整份文件所有項目都沒有 evaluations（如 Abraham 格式）
  // 代表 AI 可能誤將整體 finalRating 當成第一個 KPI 的 itemRating
  // → 清除所有 itemRating，並補齊 finalRating
  const hasAnyEvaluations = items.some(i => i.evaluations.length > 0);
  if (!hasAnyEvaluations) {
    const firstItemRating = items.find(i => i.itemRating)?.itemRating ?? null;
    if (!finalRating && firstItemRating) finalRating = firstItemRating;
    items.forEach(i => { i.itemRating = null; });
  }

  return {
    period: normalizePeriod(raw.period),
    name: normalizeString(raw.name),
    department: normalizeString(raw.department),
    employeeCode: normalizeString(raw.employeeCode),
    jobTitle: normalizeString(raw.jobTitle),
    overallSelfSummary: normalizeString(raw.overallSelfSummary),
    finalRating,
    items,
    overallManagerComments: normalizeManagerComments(raw.overallManagerComments),
  };
}

/**
 * PRP 匯入服務
 * 利用 Gemini API 將 Markdown 格式的績效考核表轉換為結構化資料
 */
export const prpImportService = {
  async parsePRPMarkdown(markdown: string): Promise<ParsedPRP> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("找不到 VITE_GEMINI_API_KEY 環境變數，請確認 .env");
    }
    const systemInstruction = `
      你是一個專門解析企業績效考核 (PRP) Markdown 表格的資深資料助理。
      你的目標是將非結構化的 Markdown 表格轉換為精確的結構化 JSON。
      
      特別注意考評表的【多列邏輯】與【跨行對應】：
      1. 【內容解析】：項目描述中若包含多段內容，請務必完整擷取，並整理成條列式格式（每點以 "• " 開頭並換行分隔）。以下格式都應轉換為條列：
         - 數字列表：「1. xxx 2. xxx」→ 每項一個 "• " 條目
         - 方括號標籤：「\[高複雜度遷徙\]：xxx \[關鍵技術決策\]：yyy」→ 每個 [tag]: 為一個 "• " 條目（保留標籤文字）
         - 換行段落：多行文字各自獨立一個條目
         - 不可將所有內容串成一行。
      2. 【意見對應】：
         - 同一列中，後方通常存在多個主管意見。請依位置區分：
           - 第 6 欄通常是「原主管意見」，對應第 10 欄的分數。
           - 第 13 欄（如有 1. 2. 3.. 之類內容）通常是「核准主管意見」，對應第 11 欄的分數。
         - 若下方出現標有「新主管意見」的特殊跨行，請將其內容與對應的分數合併到同一個 KPI 項目的 evaluations 陣列中。
      3. 【等第 Checkbox】：
         - 識別表格中的勾選框。格式如「□S ☑A □B」或「[ ]S [x]A [ ]B」或「□S ■A □B」（■ 也代表勾選）。
         - 若看到「☑」、「[x]」或「■」，請將該符號後方的英文字母作為 finalRating 或 itemRating 回傳（例如：☑A -> "A"）。
         - 【重要】itemRating vs finalRating 判斷：
           * 若整份文件中所有 KPI/核心職能項目都沒有任何主管分數與評語（evaluations 皆為空），表示這份文件沒有逐項評分，等第欄的值應視為整體 finalRating，所有 itemRating 應設為 null。
           * 若各 KPI 都有各自的主管分數，則等第欄的值才是各 KPI 的 itemRating。
      4. 【數值處理】：分數欄位若是文字（如「分數」或「-」），請設為 null 或忽略。
      5. 【核准主管欄位的跨行判斷】：
         - 核准主管的意見欄（通常在第 13 欄）、分數欄（第 11 欄）、等第欄（第 14 欄），有時在排版上僅出現在第一個 KPI 的同列，但邏輯上屬於整份考核的「整體核准評核」，並不隸屬於該 KPI。
         - 判斷依據：若只有第一個 KPI 列有核准主管欄位，而後續 KPI 列該欄位皆為空，則應將此核准資訊視為整體評核，存入 overallManagerComments，不要放入任何 KPI 的 evaluations。
      6. 【佔位符識別】：若某欄位內容僅為「1. 2. 3.」、「1.2.3.」或純數字加句點的空白樣板文字，視為空白佔位符，不要當作真實內容解析。
      7. 【項目標題萃取】：每個 KPI 或核心職能項目都必須有一個有意義的 itemLabel（標題），規則如下：
         - 優先辨識：若 selfDescription 欄位開頭有 Markdown 粗體標記（**標題文字**），提取粗體文字作為 itemLabel，並從 selfDescription 中移除該粗體標記，只保留描述內容。
         - 次要辨識：若欄位中有明顯的短句標題（通常在第一句，後接換行或較長說明），提取該短句作為 itemLabel。
         - 若以上皆無：根據 selfDescription 的核心內容，自行生成一個繁體中文簡短標題（8～15 字內），能代表該項目的主題。
         - 不可讓 itemLabel 停留在「KPI」、「KPI 1」、「核心職能」等無意義的通用標籤。
      `;

    const prompt = `
      請精準解析以下 PRP Markdown 內容。這是一份複雜的考評表，請嚴格遵守以下規則：

      【核心規則】
      1. **完整性**：selfDescription 必須收錄所有內容。不可因為內容過長而截斷。
      2. **意見歸因**：
         - 表格中一列可能有多段意見。請將其識別為不同 label： "原主管", "核准主管", "新主管"。
         - 範例：如果同一列 13 欄有內容，這通常是「核准主管」的意見，其分數在第 11 欄。
      3. **跨行處理**：KPI 行之後，若緊跟著標示有「新主管意見」的行位，請將該行內容視為同一項目的補充，存入 evaluations。
      4. **checkbox 識別**：尋找「☑」字樣。例如「□S ☑A □B □C □D」代表最終等第為 "A"。請將此值填入 finalRating。
      5. **核准主管欄位歸屬判斷**：若核准主管的意見、分數、等第只出現在第一個 KPI 的列，而其他 KPI 列該欄皆為空，代表這是整體核准評核，應存入 overallManagerComments（label: "核准主管"），不要放入第一個 KPI 的 evaluations。
      6. **佔位符過濾**：若某欄位內容僅為「1. 2. 3.」或類似的空白樣板文字（無實際評語），視為空白，不解析為意見內容。
      7. **itemLabel 標題規則**：每個項目都必須有有意義的標題，不可用「KPI」、「KPI 1」等通用標籤。
         - 若 selfDescription 開頭有 **粗體文字**，提取為 itemLabel，並從 selfDescription 移除該粗體標記。
         - 若無粗體，取第一句短標題；若仍無，根據內容自行生成 8～15 字的繁體中文標題。

      【優秀範例 (Few-shot)】
      Markdown:
      | KPI | | **DRM 研究及導入** 帶領前端團隊進行研究並設計出實作流程... | | 3 | 成功導入 KKTV DRM | | | | 81 | 80.6 | □S □A ☑B □C □D | 1. 2. 3. | □S □A □B ☑C □D |
      | KPI | | 協助團隊完成離線播放驗證，提供可參考的程式架構 | | 2 | 順利完成串接 | | | | 78 | | | | |

      Output JSON:
      {
        "items": [
          {
            "itemLabel": "DRM 研究及導入",
            "itemType": "kpi",
            "selfDescription": "帶領前端團隊進行研究並設計出實作流程...",
            "evaluations": [{"label": "原主管", "comment": "成功導入 KKTV DRM", "score": 81}],
            "itemRating": "B"
          },
          {
            "itemLabel": "離線播放前期驗證與架構規劃",
            "itemType": "kpi",
            "selfDescription": "協助團隊完成離線播放驗證，提供可參考的程式架構",
            "evaluations": [{"label": "原主管", "comment": "順利完成串接", "score": 78}],
            "itemRating": null
          }
        ],
        "overallManagerComments": [{"label": "核准主管", "comment": null, "score": 80.6}],
        "finalRating": "C"
      }

      【待解析 Markdown 內容】
      ${markdown}

      【輸出 JSON 欄位】
      - period, department, name, employeeCode, jobTitle
      - items: Array of { itemType, itemLabel, importance, selfDescription, evaluations: [{label, comment, score}], itemRating }
      - overallSelfSummary (綜合考核自評)
      - overallManagerComments: Array of {label, comment}
      - finalRating (最終評等)
□S ■A □B）通常是「整份考核的最終等第」。
         - 除非確定每個 KPI 或職能都有獨立分開的評等結果，否則請將其解析為 finalRating，不要將其填入單一項目的 itemRating 中。
      4. 【多重主管評語與分數】：精確擷取該項目對應的所有意見欄位（例如：原主管意見、初評、核准主管意見）。若有數字分數請填入，若出現 "-" 或文字則設為 null。
      5. 【綜合考核列 (Overall Assessment)】：
         - 這一行通常在表格末尾。包含自評與主管總結評語（可能包含原主管與新主管多段內容）。
         - **關鍵**：若內容中包含多個觀察點（如以 1. 2. 3. 或 - 開頭），請在 JSON 中將其整理為條列格式（每點換行並加 "• "）。
      6. 【多主管意見】：若「主管意見」欄位中同時出現原主管、新主管或多段意見，請分別存入 evaluations 陣列。

      【Markdown 內容】
      ${markdown}

      【輸出需求】
      請回傳 JSON 格式，包含以下欄位：
      1. period: 考核年度 (例如: "2025")
      2. department: 部門名稱
      3. name: 員工姓名
      4. employeeCode: 員工編號
      5. jobTitle: 職稱
      6. items: 包含 KPI 與核心職能的陣列。每個項目需包含：
         - itemType: "kpi" 或 "core_competency"
         - itemLabel: 項目標題 (例如: "KPI 1", "團隊合作")
         - importance: 重要度 (1-3)
         - selfDescription: 內容說明/自述
         - evaluations: 陣列，包含各個主管的評語與分數
           - label: 主管類型 (例如: "原主管", "新主管")
           - comment: 評語
           - score: 分數 (數字)
         - itemRating: 該項獲評等第 (S/A/B/C/D)，如有
      7. overallSelfSummary: 綜合考核列中的「自述/自評內容」文字。
      8. overallManagerComments: 陣列。請從以下兩個來源提取：
         (a) 綜合考核列中屬於主管的總結評語（label: "原主管" / "新主管" / "部門主管"）
         (b) 只出現在第一個 KPI 列的核准主管整體分數與等第（label: "核准主管"），即使沒有文字評語也要包含其分數
         每筆格式：{ label, comment（可空字串）, score（數字或 null）}
      9. items[].averageScore: 每個 KPI/核心職能對應的「平均」欄數字（如 86、85.4），無則省略
      10. finalRating: 最終核定等第 (S/A/B/C/D)
    `;

    try {
      console.log("🚀 [PRP Import] Starting Gemini analysis...");
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              period: { type: Type.STRING },
              department: { type: Type.STRING },
              name: { type: Type.STRING },
              employeeCode: { type: Type.STRING },
              jobTitle: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    itemType: { type: Type.STRING },
                    itemLabel: { type: Type.STRING },
                    importance: { type: Type.NUMBER },
                    selfDescription: { type: Type.STRING },
                    evaluations: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          label: { type: Type.STRING },
                          comment: { type: Type.STRING },
                          score: { type: Type.NUMBER }
                        },
                        required: ['label', 'comment']
                      }
                    },
                    itemRating: { type: Type.STRING },
                    averageScore: { type: Type.NUMBER }
                  },
                  required: ['itemType', 'itemLabel', 'selfDescription', 'evaluations']
                }
              },
              overallSelfSummary: { type: Type.STRING },
              overallManagerComments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    comment: { type: Type.STRING },
                    score: { type: Type.NUMBER }
                  },
                  required: ['label', 'comment']
                }
              },
              finalRating: { type: Type.STRING }
            },
            required: ['period', 'name', 'items']
          }
        }
      });

      const responseText = response.text || '';
      console.log("📥 [PRP Import] Raw AI Response:", responseText);
      
      if (!responseText) {
        throw new Error("AI 回傳了空內容，可能是安全過濾器攔截了文件內容。");
      }

      // 清理 JSON，移除 Markdown 標記
      const cleanJson = responseText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
        .trim();
        
      try {
        const raw = JSON.parse(cleanJson);
        const normalized = normalizePRPOutput(raw);
        console.log("✅ [PRP Import] Normalized output:", normalized);
        return normalized;
      } catch (jsonErr) {
        console.error("JSON Parse Error. Cleaned string:", cleanJson);
        throw new Error("AI 產出資料格式損毀，請重試一次。");
      }
    } catch (e: any) {
      console.error("🔴 Gemini PRP Parse Error:", e);
      // 擷取更具體的錯誤訊息給使用者
      const detail = e.message || String(e);
      throw new Error(`績效檔案解析失敗：${detail.includes('403') ? 'API Key 權限不足或額度已滿' : detail}`);
    }
  }
};
