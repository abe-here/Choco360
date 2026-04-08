
import { GoogleGenAI, Type } from "@google/genai";
import { FeedbackEntry, AIAnalysis, Questionnaire } from "../types";
import { GEMINI_MODELS } from "../constants";

export const analyzeFeedback = async (feedbacks: FeedbackEntry[], questionnaire: Questionnaire): Promise<AIAnalysis> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("找不到 VITE_GEMINI_API_KEY 環境變數，請確認 .env.local 已正確設定。");
  }
  const ai = new GoogleGenAI({ apiKey });
  
  // 提取問項文字回饋與評分
  const openEndedAnswers = feedbacks.flatMap(f => 
    (f.responses || [])
      .filter(r => r.answerText && r.answerText.length > 0)
      .map(r => `[${r.dimensionName}]: ${r.answerText}`)
  ).join('\n');

  const scores = feedbacks.map(f => 
    (f.responses || [])
      .filter(r => r.score !== undefined)
      .map(r => `${r.dimensionName}: ${r.score}/5`)
      .join(', ')
  ).join('\n');

  const dimensionGuides = (questionnaire.dimensions || []).map(d => `- ${d.name}：${d.purpose}`).join('\n');

  const systemInstruction = `
    你是一位矽谷專業 HR 指導教練與技術領袖，正在為一位員工分析 360 度專業評鑑結果。
    
    本次評鑑採用的維度架構如下：
    ${dimensionGuides}

    請嚴格遵守上述維度定義進行質性分析。請務必仔細閱讀「文字回饋」，那裡通常藏有最關鍵的行為證據。
  `;

  const prompt = `
    量化評分數據：
    ${scores}

    文字回饋內容：
    ${openEndedAnswers}

    請使用「繁體中文」產出 JSON 格式的績效洞察：
    1. summary: 整體戰略價值摘要（約 60 字）。
    2. strengths: 結合數據與文字證據，提取 3 項具體優勢。
    3. growthAreas: 結合負面回饋或建議，提取 2 項改進建議。
    4. actionPlan: 提供 3 個具體的未來季度行動步驟。
    5. superpowers: 綜合所有正面回饋，為該員工提煉出最多 3 個「超能力稱號」(Superpowers)。
       每個超能力需要：
       - title: 英文大寫的稱號，例如 "THE SYNERGY ARCHITECT", "THE CODE SORCERER", "THE EMPATHY HEALER" 等具史詩感與榮譽感的稱號。
       - category: 只能是 "strategic" (戰略、邏輯、問題解決), "support" (支援、協作、情緒價值), 或 "leadership" (領導、視野、影響力) 其中之一。
       - description: 繁體中文一小段描述為何獲得此稱號。
  `;

  const response = await ai.models.generateContent({
    model: GEMINI_MODELS.feedbackAnalysis,
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          growthAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
          actionPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
          superpowers: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                category: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ['title', 'category', 'description']
            } 
          }
        },
        required: ['summary', 'strengths', 'growthAreas', 'actionPlan', 'superpowers']
      }
    }
  });

  const responseText = response.text || '';
  
  try {
    // 徹底清理 JSON，移除 Markdown 代碼塊與不可見字元
    const cleanJson = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
      .trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Gemini JSON parse error:", e, "Original text:", responseText);
    throw new Error("AI 產出格式異常，請嘗試重新整理報告");
  }
};
