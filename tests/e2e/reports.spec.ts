import { test, expect } from '@playwright/test';

test.describe('06. Reports & AI Coach', () => {

  // ====== 共用 Mock 資料 ======
  const mockUser = {
    id: 'emp-1', name: 'Employee A', email: 'employee@choco.media',
    role: 'Developer', department: 'Product', is_system_admin: false,
    is_manager: false, manager_email: 'manager@choco.media',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=employee'
  };

  const mockQuestionnaire = {
    id: 'q-1', title: 'Q1 Performance Review', description: '年度績效問卷',
    active: true, created_at: '2024-01-01T00:00:00Z',
    dimensions: [
      {
        id: 'dim-1', name: '團隊合作', purpose: '評估團隊協作能力',
        questions: [
          { id: 'q1-r', text: '能夠主動協助團隊成員解決問題', question_type: 'rating' },
          { id: 'q1-t', text: '請提供具體合作實例：', question_type: 'text' }
        ]
      },
      {
        id: 'dim-2', name: '問題解決', purpose: '評估分析與解決問題的能力',
        questions: [
          { id: 'q2-r', text: '面對複雜問題時能提出有效解決方案', question_type: 'rating' },
          { id: 'q2-t', text: '請描述一個解決問題的具體實例：', question_type: 'text' }
        ]
      },
      {
        id: 'dim-3', name: '溝通表達', purpose: '評估口頭與書面溝通的清晰度',
        questions: [
          { id: 'q3-r', text: '溝通時能清楚表達觀點並傾聽他人意見', question_type: 'rating' }
        ]
      }
    ]
  };

  const cachedAIAnalysis = {
    summary: '該員工在團隊合作與問題解決上表現突出，溝通能力有進步空間。',
    strengths: ['優秀的團隊協作精神', '強大的問題分析能力', '積極主動的工作態度'],
    growthAreas: ['跨部門溝通可再加強', '書面報告的結構化表達'],
    actionPlan: ['每月參加跨部門會議', '學習結構化寫作課程', '建立每週 1-on-1 對話機制']
  };

  const mockNominations = [
    {
      id: 'nom-1', title: '2024 Q4 互評', requester_id: 'emp-1',
      reviewer_ids: ['emp-2', 'emp-3'], status: 'Approved',
      manager_email: 'manager@choco.media', questionnaire_id: 'q-1',
      due_date: '2024-12-31T00:00:00Z', created_at: '2024-10-01T00:00:00Z',
      ai_analysis: cachedAIAnalysis, analysis_feedback_count: 3
    },
    {
      id: 'nom-2', title: '2024 Q2 互評', requester_id: 'emp-1',
      reviewer_ids: ['emp-2'], status: 'Approved',
      manager_email: 'manager@choco.media', questionnaire_id: 'q-1',
      due_date: '2024-06-30T00:00:00Z', created_at: '2024-04-01T00:00:00Z',
      ai_analysis: null, analysis_feedback_count: 0
    }
  ];

  // Self-feedback + 2 peer feedbacks for nom-1
  const mockFeedbacks = [
    {
      id: 'fb-self', from_user_id: 'emp-1', to_user_id: 'emp-1',
      questionnaire_id: 'q-1', nomination_id: 'nom-1',
      stop_comments: '', start_comments: '', continue_comments: '',
      created_at: '2024-11-01T00:00:00Z',
      feedback_responses: [
        { id: 'fr-s1', feedback_id: 'fb-self', question_id: 'q1-r', score: 4, answer_text: null, dimension_name: '團隊合作' },
        { id: 'fr-s2', feedback_id: 'fb-self', question_id: 'q1-t', score: null, answer_text: '我經常主動幫助同事 debug。', dimension_name: '團隊合作' },
        { id: 'fr-s3', feedback_id: 'fb-self', question_id: 'q2-r', score: 5, answer_text: null, dimension_name: '問題解決' },
        { id: 'fr-s4', feedback_id: 'fb-self', question_id: 'q2-t', score: null, answer_text: '帶領團隊完成了系統重構。', dimension_name: '問題解決' },
        { id: 'fr-s5', feedback_id: 'fb-self', question_id: 'q3-r', score: 3, answer_text: null, dimension_name: '溝通表達' }
      ]
    },
    {
      id: 'fb-peer1', from_user_id: 'emp-2', to_user_id: 'emp-1',
      questionnaire_id: 'q-1', nomination_id: 'nom-1',
      stop_comments: '', start_comments: '', continue_comments: '',
      created_at: '2024-11-02T00:00:00Z',
      feedback_responses: [
        { id: 'fr-p1-1', feedback_id: 'fb-peer1', question_id: 'q1-r', score: 5, answer_text: null, dimension_name: '團隊合作' },
        { id: 'fr-p1-2', feedback_id: 'fb-peer1', question_id: 'q1-t', score: null, answer_text: '在專案緊急時主動加班協助。', dimension_name: '團隊合作' },
        { id: 'fr-p1-3', feedback_id: 'fb-peer1', question_id: 'q2-r', score: 4, answer_text: null, dimension_name: '問題解決' },
        { id: 'fr-p1-4', feedback_id: 'fb-peer1', question_id: 'q2-t', score: null, answer_text: '提出了很好的架構改善建議。', dimension_name: '問題解決' },
        { id: 'fr-p1-5', feedback_id: 'fb-peer1', question_id: 'q3-r', score: 3, answer_text: null, dimension_name: '溝通表達' }
      ]
    },
    {
      id: 'fb-peer2', from_user_id: 'emp-3', to_user_id: 'emp-1',
      questionnaire_id: 'q-1', nomination_id: 'nom-1',
      stop_comments: '', start_comments: '', continue_comments: '',
      created_at: '2024-11-03T00:00:00Z',
      feedback_responses: [
        { id: 'fr-p2-1', feedback_id: 'fb-peer2', question_id: 'q1-r', score: 4, answer_text: null, dimension_name: '團隊合作' },
        { id: 'fr-p2-2', feedback_id: 'fb-peer2', question_id: 'q1-t', score: null, answer_text: '願意分享知識並耐心指導新人。', dimension_name: '團隊合作' },
        { id: 'fr-p2-3', feedback_id: 'fb-peer2', question_id: 'q2-r', score: 1, answer_text: null, dimension_name: '問題解決' },
        { id: 'fr-p2-4', feedback_id: 'fb-peer2', question_id: 'q2-t', score: null, answer_text: '對於這方面我不太清楚。', dimension_name: '問題解決' },
        { id: 'fr-p2-5', feedback_id: 'fb-peer2', question_id: 'q3-r', score: 4, answer_text: null, dimension_name: '溝通表達' }
      ]
    }
  ];

  test.beforeEach(async ({ page }) => {
    // === Mock: profiles ===
    await page.route('**/*/rest/v1/profiles*', async (route, request) => {
      const method = request.method();
      if (method === 'PATCH' || method === 'POST' || method === 'DELETE') {
        await route.fulfill({ status: 204 });
        return;
      }
      const isSingle = request.headers()['accept']?.includes('vnd.pgrst.object');
      if (request.url().includes('email=eq.employee')) {
        await route.fulfill({ status: 200, json: isSingle ? mockUser : [mockUser] });
        return;
      }
      await route.fulfill({ status: 200, json: [mockUser] });
    });

    // === Mock: questionnaires ===
    await page.route('**/*/rest/v1/questionnaires*', async (route) => {
      await route.fulfill({ status: 200, json: [mockQuestionnaire] });
    });

    // === Mock: feedbacks ===
    await page.route('**/*/rest/v1/feedbacks*', async (route, request) => {
      if (request.method() !== 'GET') {
        await route.fulfill({ status: 201, json: [{ id: 'fb-new' }] });
        return;
      }
      const url = request.url();
      // getFeedbacksForUser: to_user_id=eq.emp-1
      if (url.includes('to_user_id=eq.emp-1')) {
        await route.fulfill({ status: 200, json: mockFeedbacks });
        return;
      }
      // getNominationTasks checks from_user_id
      if (url.includes('from_user_id')) {
        await route.fulfill({ status: 200, json: [] });
        return;
      }
      await route.fulfill({ status: 200, json: [] });
    });

    // === Mock: feedback_responses ===
    await page.route('**/*/rest/v1/feedback_responses*', async (route) => {
      await route.fulfill({ status: 201 });
    });

    // === Mock: nominations ===
    await page.route('**/*/rest/v1/nominations*', async (route, request) => {
      if (request.method() !== 'GET') {
        await route.fulfill({ status: 204 });
        return;
      }
      const url = request.url();
      // getNominationsByRequester: requester_id=eq.emp-1
      if (url.includes('requester_id=eq.emp-1')) {
        await route.fulfill({ status: 200, json: mockNominations });
        return;
      }
      // getNominationsForManager
      if (url.includes('manager_email=eq.')) {
        await route.fulfill({ status: 200, json: [] });
        return;
      }
      // getNominationTasks
      if (url.includes('status=eq.Approved')) {
        await route.fulfill({ status: 200, json: [] });
        return;
      }
      await route.fulfill({ status: 200, json: [] });
    });

    // === Mock: system_messages ===
    await page.route('**/*/rest/v1/system_messages*', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });

    // Auth
    await page.addInitScript(() => {
      window.localStorage.setItem('nexus360_user_email', 'employee@choco.media');
    });

    await page.goto('/');
    await expect(page.locator('h1:has-text("歡迎使用 Choco360 👋")')).toBeVisible({ timeout: 10000 });

    // Navigate to Reports
    await page.locator('nav button', { hasText: '我的報告' }).click();
    await expect(page.locator('h1:has-text("個人成長報告")')).toBeVisible({ timeout: 10000 });
  });

  // ====== Test 1: 頁面載入與標題 ======
  test('頁面正確載入並顯示標題與副標題', async ({ page }) => {
    await expect(page.locator('h1:has-text("個人成長報告")')).toBeVisible();
    await expect(page.locator('text=深度洞察您的專業表現與潛在成長區域。')).toBeVisible();
  });

  // ====== Test 2: 評鑑週期切換 ======
  test('下拉選單可切換評鑑週期', async ({ page }) => {
    // 確認下拉選單標籤
    await expect(page.locator('text=評鑑週期切換')).toBeVisible();

    // 確認兩個 nomination 都在 select 中
    const select = page.locator('select');
    await expect(select.locator('option', { hasText: '2024 Q4 互評' })).toBeAttached();
    await expect(select.locator('option', { hasText: '2024 Q2 互評' })).toBeAttached();

    // 預設選取第一筆 (nom-1)，AI 面板應顯示快取結果
    await expect(page.locator('text=基於 3 份回饋分析')).toBeVisible();

    // 切換到第二筆 (nom-2，無 AI 分析)
    await select.selectOption({ label: '2024 Q2 互評' });
    await expect(page.locator('text=基於 0 份回饋分析')).toBeVisible();
  });

  // ====== Test 3: 雷達圖渲染 ======
  test('雷達圖正確渲染且顯示維度標籤', async ({ page }) => {
    // SVG 存在
    const svg = page.locator('svg');
    await expect(svg.first()).toBeVisible();

    // 3 個維度標籤
    await expect(page.locator('text=團隊合作').first()).toBeVisible();
    await expect(page.locator('text=問題解決').first()).toBeVisible();
    await expect(page.locator('text=溝通表達').first()).toBeVisible();
  });

  // ====== Test 4: 雷達圖圖例 ======
  test('雷達圖圖例顯示自評與他評平均', async ({ page }) => {
    // 雷達圖所在的 section（含 落差分析雷達圖 標題）
    const radarSection = page.locator('section', { has: page.locator('h2:has-text("落差分析雷達圖")') });
    await expect(radarSection.getByText('自評', { exact: true })).toBeVisible();
    await expect(radarSection.getByText('他評平均', { exact: true })).toBeVisible();
  });

  // ====== Test 5: AI 成長導師面板 - 快取結果顯示 ======
  test('AI 面板顯示快取的分析結果', async ({ page }) => {
    // 面板標題
    await expect(page.locator('text=Gemini AI 成長導師')).toBeVisible();

    // 快取的 summary
    await expect(page.locator(`text=${cachedAIAnalysis.summary}`)).toBeVisible();

    // strengths
    await expect(page.locator('text=顯性優勢 (Strengths)')).toBeVisible();
    await expect(page.locator(`text=${cachedAIAnalysis.strengths[0]}`)).toBeVisible();
    await expect(page.locator(`text=${cachedAIAnalysis.strengths[1]}`)).toBeVisible();

    // growthAreas
    await expect(page.locator('text=待解盲點 (Growth Areas)')).toBeVisible();
    await expect(page.locator(`text=${cachedAIAnalysis.growthAreas[0]}`)).toBeVisible();
  });

  // ====== Test 6: AI 生成按鈕與不足提示 ======
  test('切換至無足夠回饋的週期後點擊 AI 按鈕會提示數據不足', async ({ page }) => {
    // 確認按鈕
    await expect(page.locator('button:has-text("生成 AI 洞察")')).toBeVisible();

    // 切換到 nom-2（無回饋）
    await page.locator('select').selectOption({ label: '2024 Q2 互評' });

    // 點擊 AI 按鈕
    let alertMsg = '';
    page.once('dialog', async dialog => {
      alertMsg = dialog.message();
      await dialog.dismiss();
    });

    await page.locator('button:has-text("生成 AI 洞察")').click();
    await page.waitForTimeout(500);
    expect(alertMsg).toContain('數據不足');
  });

  // ====== Test 7: 原始數據細項 ======
  test('原始數據細項顯示維度、題目與分數標章', async ({ page }) => {
    // 區塊標題
    await expect(page.locator('text=原始數據細項')).toBeVisible();
    await expect(page.locator('text=Raw Feedback Metrics')).toBeVisible();

    // 維度名稱與目的
    await expect(page.locator('h3:has-text("團隊合作")')).toBeVisible();
    await expect(page.locator('text=評估團隊協作能力')).toBeVisible();

    await expect(page.locator('h3:has-text("問題解決")')).toBeVisible();
    await expect(page.locator('text=評估分析與解決問題的能力')).toBeVisible();

    // 題目文字
    await expect(page.locator('h4:has-text("能夠主動協助團隊成員解決問題")')).toBeVisible();
    await expect(page.locator('h4:has-text("面對複雜問題時能提出有效解決方案")')).toBeVisible();

    // 維度平均標籤
    await expect(page.locator('text=維度自評平均').first()).toBeVisible();
    await expect(page.locator('text=維度他評平均').first()).toBeVisible();

    // 分數標章 (ScoreBadge) 存在 — 驗證他評和自評區分
    await expect(page.locator('text=同事評分').first()).toBeVisible();
    await expect(page.locator('text=您的自評').first()).toBeVisible();
  });

  // ====== Test 8: 文字回饋匿名顯示 ======
  test('文字題顯示自評觀點與同事匿名回饋', async ({ page }) => {
    // 自評文字
    await expect(page.locator('text=您的自評觀點').first()).toBeVisible();
    await expect(page.locator('text=我經常主動幫助同事 debug。')).toBeVisible();

    // 同事匿名文字回饋
    await expect(page.locator('text=同事具體觀察描述').first()).toBeVisible();
    await expect(page.locator('text=在專案緊急時主動加班協助。')).toBeVisible();
    await expect(page.locator('text=願意分享知識並耐心指導新人。')).toBeVisible();
  });

});
