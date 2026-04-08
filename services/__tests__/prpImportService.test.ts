import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prpImportService } from '../prpImportService';

// Mock @google/genai
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
      };
    },
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      ARRAY: 'ARRAY',
      NUMBER: 'NUMBER',
    },
  };
});

describe('prpImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockMarkdown = `
| 巧克科技 2025年 目標考核表 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| ----- | :---- | ----- | :---: | ----- | ----- | :---- | :---: | :---- | :---: | ----- | ----- | ----- | ----- |
| 部門 |  | 研發部 | 姓名 | 方信登 | 員編 | F25509 | 職稱 | Senior Backend Engineer |  |  |  |  |  |
| 項目 |  | 考核目標內容與說明 |  | 重要度 1→3 | 原主管意見 |  |  |  | 分數 | 平均 | 等第 | **意見** | **等第** |
| KPI 1 |  | 協助KKTV->LINETV整併 Infra架構 |  | 3 | Mark 負責態度認真。 |  |  |  | 84 | 86 | □S ☑A | 1. 2. 3. | □S ☑A |
| 核心 職能 1 |  | 團隊合作 |  | 2 | 在系統設計展現良好分析能力。 |  |  |  | 85 |  |  |  |  |
| 綜合考核 |  | 成功承接關鍵系統 |  |  | Mark是個追求卓越的人。 |  |  |  |  |  |  |  |  |
  `;

  it('應正確解析 Markdown 並返回結構化 JSON', async () => {
    const aiResponse = {
      period: "2025",
      name: "方信登",
      employeeCode: "F25509",
      department: "研發部",
      jobTitle: "Senior Backend Engineer",
      items: [
        {
          itemType: "kpi",
          itemLabel: "KPI 1",
          selfDescription: "協助KKTV->LINETV整併 Infra架構",
          importance: 3,
          evaluations: [
            { label: "原主管", comment: "Mark 負責態度認真。", score: 84 }
          ]
        },
        {
          itemType: "core_competency",
          itemLabel: "團隊合作",
          selfDescription: "團隊合作內容",
          importance: 2,
          evaluations: [
            { label: "原主管", comment: "在系統設計展現良好分析能力。", score: 85 }
          ]
        }
      ],
      overallSelfSummary: "成功承接關鍵系統",
      overallManagerComments: [
        { label: "原主管", comment: "Mark是個追求卓越的人。" }
      ],
      finalRating: "A"
    };

    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify(aiResponse),
    });

    const result = await prpImportService.parsePRPMarkdown(mockMarkdown);

    expect(result.name).toBe("方信登");
    expect(result.period).toBe("2025");
    expect(result.items).toHaveLength(2);
    // "KPI 1" 是通用標籤，normalization 層會改用 selfDescription 首句作為標題
    expect(result.items![0].itemLabel).toBe("協助KKTV->LINETV整併 Infra架構");
    expect(result.items![0].evaluations[0].score).toBe(84);
    expect(result.finalRating).toBe("A");
    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it('應處理含有 Markdown 代碼塊的 JSON 回應', async () => {
    const aiResponse = {
      period: "2025",
      name: "方信登",
      items: [],
      finalRating: "A"
    };

    mockGenerateContent.mockResolvedValue({
      text: "```json\n" + JSON.stringify(aiResponse) + "\n```",
    });

    const result = await prpImportService.parsePRPMarkdown(mockMarkdown);
    expect(result.period).toBe("2025");
  });

  it('當 API 調用失敗時應拋出明確錯誤', async () => {
    mockGenerateContent.mockRejectedValue(new Error("Gemini Error"));

    await expect(prpImportService.parsePRPMarkdown(mockMarkdown))
      .rejects.toThrow("績效檔案解析失敗");
  });

  it('當 JSON 解析失敗時應拋出明確錯誤', async () => {
    mockGenerateContent.mockResolvedValue({
      text: "INVALID JSON",
    });

    await expect(prpImportService.parsePRPMarkdown(mockMarkdown))
      .rejects.toThrow("績效檔案解析失敗");
  });
});
