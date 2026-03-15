
import { GoogleGenAI, Type } from "@google/genai";
import { FeedbackEntry, AIAnalysis, Questionnaire } from "../types";

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
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
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
          actionPlan: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['summary', 'strengths', 'growthAreas', 'actionPlan']
      }
    }
  });

  const responseText = response.text || '';
  
  try {
    // 徹底清理 JSON，移除 Markdown 代碼塊以及任何不可見字元
    const cleanJson = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
      .trim();
    
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error("Gemini JSON parse error:", e, "Original text:", responseText);
    throw new Error("AI 產出格式異常，請嘗試重新點擊按鈕生成報告");
  }
};
