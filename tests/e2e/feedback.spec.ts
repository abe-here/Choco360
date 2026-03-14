import { test, expect } from '@playwright/test';

test.describe('05. Feedback Execution Flow', () => {

  test.beforeEach(async ({ page }) => {
    // === Mock: profiles ===
    await page.route('**/*/rest/v1/profiles*', async (route, request) => {
      const url = request.url();
      const method = request.method();
      if (method === 'PATCH' || method === 'POST' || method === 'DELETE') {
        await route.fulfill({ status: 204 });
        return;
      }
      const isSingle = request.headers()['accept']?.includes('vnd.pgrst.object');
      if (url.includes('email=eq.employee')) {
        const d = { id: 'emp-1', name: 'Employee A', email: 'employee@choco.media', role: 'Developer', department: 'Product', is_system_admin: false, is_manager: false, manager_email: 'manager@choco.media', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=employee' };
        await route.fulfill({ status: 200, json: isSingle ? d : [d] });
        return;
      }
      await route.fulfill({
        status: 200,
        json: [
          { id: 'emp-1', name: 'Employee A', email: 'employee@choco.media', role: 'Developer', department: 'Product', is_system_admin: false, is_manager: false, manager_email: 'manager@choco.media', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=employee' },
          { id: 'emp-2', name: 'Bob Designer', email: 'bob@choco.media', role: 'Designer', department: 'Product', is_system_admin: false, is_manager: false, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob' }
        ]
      });
    });

    // === Mock: questionnaires (with nested dimensions/questions) ===
    await page.route('**/*/rest/v1/questionnaires*', async (route) => {
      await route.fulfill({
        status: 200,
        json: [
          {
            id: 'q-1',
            title: 'Q1 Performance Review',
            description: '年度績效問卷',
            active: true,
            created_at: '2024-01-01T00:00:00Z',
            dimensions: [
              {
                id: 'dim-1',
                name: '團隊合作',
                purpose: '評估與團隊成員的協作能力',
                questions: [
                  { id: 'q-1-1', text: '能夠主動協助團隊成員解決問題', question_type: 'rating' },
                  { id: 'q-1-2', text: '請提供具體合作實例：', question_type: 'text' }
                ]
              }
            ]
          }
        ]
      });
    });

    // === Mock: feedbacks ===
    await page.route('**/*/rest/v1/feedbacks*', async (route, request) => {
      const url = request.url();
      const method = request.method();
      if (method === 'POST') {
        // submitFeedback inserts into feedbacks table, returns {id}
        const isSingle = request.headers()['accept']?.includes('vnd.pgrst.object');
        await route.fulfill({ status: 201, json: isSingle ? { id: 'fb-new-1' } : [{ id: 'fb-new-1' }] });
        return;
      }
      // GET: getNominationTasks checks from_user_id to find already-submitted
      if (url.includes('from_user_id=eq.emp-1')) {
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
      const url = request.url();
      if (request.method() !== 'GET') {
        await route.fulfill({ status: 204 });
        return;
      }
      // getNominationTasks: Approved nominations where emp-1 is reviewer or requester
      if (url.includes('status=eq.Approved')) {
        await route.fulfill({
          status: 200,
          json: [
            {
              id: 'nom-1',
              title: '2024 互評',
              requester_id: 'emp-2',
              questionnaire_id: 'q-1',
              status: 'Approved',
              due_date: '2024-12-31T00:00:00Z',
              reviewer_ids: ['emp-1'],
              manager_email: 'manager@choco.media',
              created_at: '2024-01-15T00:00:00Z'
            }
          ]
        });
        return;
      }
      await route.fulfill({ status: 200, json: [] });
    });

    // === Mock: system_messages ===
    await page.route('**/*/rest/v1/system_messages*', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });

    // Inject localStorage for auto-login
    await page.addInitScript(() => {
      window.localStorage.setItem('nexus360_user_email', 'employee@choco.media');
    });

    await page.goto('/');
    // 等待 Dashboard 載入完成
    await expect(page.locator('h1:has-text("歡迎使用 Choco360 👋")')).toBeVisible({ timeout: 10000 });
  });

  test('任務清單顯示待處理的反饋任務', async ({ page }) => {
    // 進入填寫反饋頁面
    await page.locator('nav button', { hasText: '填寫反饋' }).click();

    // 驗證頁面標題
    await expect(page.locator('main').locator('h1:has-text("填寫反饋")')).toBeVisible();

    // 驗證任務卡片：受評人與標題
    const main = page.locator('main');
    await expect(main.locator('text=Bob Designer')).toBeVisible();
    await expect(main.locator('text=2024 互評')).toBeVisible();

    // 驗證截止日期
    await expect(main.locator('text=截止日期')).toBeVisible();

    // 驗證「開始填寫」按鈕
    await expect(main.locator('text=開始填寫')).toBeVisible();
  });

  test('未完成量表題時送出會被阻擋', async ({ page }) => {
    await page.locator('nav button', { hasText: '填寫反饋' }).click();
    await expect(page.locator('main').locator('h1:has-text("填寫反饋")')).toBeVisible();

    // 點擊任務卡片開始填寫
    await page.locator('main').locator('text=開始填寫').click();

    // 驗證問卷表單內容
    await expect(page.locator('text=團隊合作')).toBeVisible();
    await expect(page.locator('text=能夠主動協助團隊成員解決問題')).toBeVisible();

    // 不填寫量表題，直接送出  
    let dialogMessage = '';
    page.once('dialog', async dialog => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });

    await page.click('button:has-text("完成填寫並送出")');
    // 等待 dialog 被處理
    await page.waitForTimeout(500);
    expect(dialogMessage).toBe('請完成所有量分題的評比後再送出。');
  });

  test('完整填寫並成功提交反饋', async ({ page }) => {
    await page.locator('nav button', { hasText: '填寫反饋' }).click();
    await expect(page.locator('main').locator('h1:has-text("填寫反饋")')).toBeVisible();

    // 點擊任務卡片開始填寫
    await page.locator('main').locator('text=開始填寫').click();

    // 驗證表單標題 (他評)
    await expect(page.locator('text=反饋問卷填寫')).toBeVisible();
    await expect(page.locator('span:has-text("Bob Designer")')).toBeVisible();

    // 填寫量表題 (選擇 "經常如此 (4)")
    await page.click('button:has-text("經常如此 (4)")');

    // 填寫文字題
    await page.getByPlaceholder('請輸入具體觀察').fill('在專案中總是能快速回應需求並提供協助。');

    // 送出
    await page.click('button:has-text("完成填寫並送出")');

    // 驗證成功畫面
    await expect(page.locator('text=反饋提交成功！')).toBeVisible();
    await expect(page.locator('text=您的回饋將協助同事')).toBeVisible();

    // 返回任務清單
    await page.click('button:has-text("返回任務清單")');
    await expect(page.locator('main').locator('h1:has-text("填寫反饋")')).toBeVisible();
  });

  test('返回按鈕可從表單回到任務清單', async ({ page }) => {
    await page.locator('nav button', { hasText: '填寫反饋' }).click();
    await expect(page.locator('main').locator('h1:has-text("填寫反饋")')).toBeVisible();

    // 進入表單
    await page.locator('main').locator('text=開始填寫').click();
    await expect(page.locator('text=反饋問卷填寫')).toBeVisible();

    // 點擊返回
    await page.click('text=返回任務清單');

    // 驗證回到任務清單
    await expect(page.locator('main').locator('h1:has-text("填寫反饋")')).toBeVisible();
  });
});
