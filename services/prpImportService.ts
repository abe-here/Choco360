import { GoogleGenAI, Type } from "@google/genai";
import { PRPItem } from "../types";

export interface ParsedPRP {
  period: string;
  department: string;
  name: string;
  employeeCode: string;
  jobTitle: string;
  overallSelfSummary: string;
  finalRating: string;
  items: Partial<PRPItem>[];
  overallManagerComments: { label: string; comment: string }[];
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
      1. 【內容解析】：項目描述中若包含數字列表 (1. 2. 3.) 或多段內容，請務必完整擷取，並整理成條列式格式（每點以 "• " 開頭並換行）。
      2. 【意見對應】：
         - 同一列中，後方通常存在多個主管意見。請依位置區分：
           - 第 6 欄通常是「原主管意見」，對應第 10 欄的分數。
           - 第 13 欄（如有 1. 2. 3.. 之類內容）通常是「核准主管意見」，對應第 11 欄的分數。
         - 若下方出現標有「新主管意見」的特殊跨行，請將其內容與對應的分數合併到同一個 KPI 項目的 evaluations 陣列中。
      3. 【等第 Checkbox】：
         - 識別表格中的勾選框。格式如「□S ☑A □B」或「[ ]S [x]A [ ]B」。
         - 若看到「☑」或「[x]」，請將該符號後方的英文字母作為 finalRating 或 itemRating 回傳（例如：☑A -> "A"）。
      4. 【數值處理】：分數欄位若是文字（如「分數」或「-」），請設為 null 或忽略。
      `;

    const prompt = `
      請精準解析以下 PRP Markdown 內容。這是一份複雜的考評表，請嚴格遵守以下規則：

      【核心規則】
      1. **完整性**：selfDescription 必須收錄所有內容。不可因為內容過長而截斷。
      2. **意見歸因**：
         - 表格中一列可能有多段意見。請將其識別為不同 label： "原主管", "核准主管", "新主管"。
         - 範例：如果同一列 13 欄有內容，這通常是「核准主管」的意見，其分數在第 11 欄。
      3. **跨行處理**：KPI 行之後，若緊跟著標示有「新主管意見」的行位，請將該行內容視為同一項目的補充，存入 evaluations。
      4. ** checkbox 識別**：尋找「☑」字樣。例如「□S ☑A □B □C □D」代表最終等第為 "A"。請將此值填入 finalRating。
      
      【優秀範例 (Few-shot)】
      Markdown:
      | KPI 1 | | 1.任務A 2.任務B | | 3 | 原評語文字 | | | | 84 | 86 | □S ☑A □B | 1. 2. 3. | □S ☑A □B |
      | | | | | | 新主管意見 | | | | 84 | | | | |
      
      Output JSON:
      {
        "items": [{
          "itemLabel": "KPI 1",
          "selfDescription": "• 任務A\n• 任務B",
          "evaluations": [
            {"label": "原主管", "comment": "原評語文字", "score": 84},
            {"label": "核准主管", "comment": "1. 2. 3.", "score": 86},
            {"label": "新主管", "comment": "...", "score": 84}
          ],
          "itemRating": "A"
        }],
        "finalRating": "A"
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
      8. overallManagerComments: 陣列。請從綜合考核列中，提取出屬於「主管」或「部門主管」的意見。
         - label: "部門主管"
         - comment: 總結意見內容
      9. finalRating: 最終核定等第 (S/A/B/C/D)
    `;

    try {
      console.log("🚀 [PRP Import] Starting Gemini analysis...");
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
                    itemRating: { type: Type.STRING }
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
                    comment: { type: Type.STRING }
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
        return JSON.parse(cleanJson);
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
