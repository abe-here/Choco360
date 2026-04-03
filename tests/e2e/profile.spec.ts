import { test, expect } from '../coverage-fixtures';

test.describe('03. Profile & Onboarding - Comprehensive Tests', () => {

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
      if (url.includes('email=eq.alice')) {
        const d = { id: 'user-id-1', name: 'Alice Smith', email: 'alice@choco.media', role: 'Frontend Developer', department: 'Product', is_system_admin: false, is_manager: false, manager_email: 'admin@choco.media', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice' };
        await route.fulfill({ status: 200, json: isSingle ? d : [d] });
        return;
      }
      await route.fulfill({
        status: 200,
        json: [
          { id: 'admin-id', name: 'Abraham Admin', email: 'admin@choco.media', role: 'CTO', department: 'Executive', is_system_admin: true, is_manager: true, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin' },
          { id: 'user-id-1', name: 'Alice Smith', email: 'alice@choco.media', role: 'Frontend Developer', department: 'Product', is_system_admin: false, is_manager: false, manager_email: 'admin@choco.media', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice' },
          { id: 'user-id-2', name: 'Bob Jones', email: 'bob@choco.media', role: 'Designer', department: 'Product', is_system_admin: false, is_manager: false, manager_email: 'admin@choco.media', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob' }
        ]
      });
    });

    // === Mock: feedbacks (not feedback_entries!) ===
    // Dashboard calls:
    //   1. getNominationTasks -> supabase.from('feedbacks').select().eq('from_user_id', userId)  [to find completed ones]
    //   2. getFeedbacksForUser -> supabase.from('feedbacks').select().eq('to_user_id', userId)   [received feedbacks]
    await page.route('**/*/rest/v1/feedbacks*', async (route, request) => {
      const url = request.url();
      if (request.method() !== 'GET') {
        await route.fulfill({ status: 204 });
        return;
      }
      // from_user_id check: used to determine "already submitted" feedback IDs 
      // We return empty so all Approved nominations appear as tasks
      if (url.includes('from_user_id=eq.user-id-1')) {
        await route.fulfill({ status: 200, json: [] });
        return;
      }
      // to_user_id: feedbacks received as the target
      if (url.includes('to_user_id=eq.user-id-1')) {
        await route.fulfill({
          status: 200,
          json: [
            { id: 'recv-1', from_user_id: 'user-id-2', to_user_id: 'user-id-1', nomination_id: 'nom-1', created_at: '2024-03-01T00:00:00Z', feedback_responses: [] },
            { id: 'recv-2', from_user_id: 'admin-id',  to_user_id: 'user-id-1', nomination_id: 'nom-1', created_at: '2024-03-02T00:00:00Z', feedback_responses: [] },
            { id: 'recv-3', from_user_id: 'user-id-2', to_user_id: 'user-id-1', nomination_id: 'nom-2', created_at: '2024-03-03T00:00:00Z', feedback_responses: [] }
          ]
        });
        return;
      }
      await route.fulfill({ status: 200, json: [] });
    });

    // === Mock: nominations ===
    // getNominationTasks query: status=Approved + reviewer_ids contains user-id-1 OR requester_id=user-id-1
    // getNominationsByRequester query: requester_id=user-id-1
    await page.route('**/*/rest/v1/nominations*', async (route, request) => {
      const url = request.url();
      if (request.method() !== 'GET') {
        await route.fulfill({ status: 204 });
        return;
      }
      // requester-based query (my own nominations, for status badge)
      if (url.includes('requester_id=eq.user-id-1')) {
        await route.fulfill({
          status: 200,
          json: [
            { id: 'nom-1', requester_id: 'user-id-1', manager_email: 'admin@choco.media', questionnaire_id: 'q-1', title: 'Alice 同儕 360', status: 'Pending', reviewer_ids: [], created_at: '2024-03-01T00:00:00Z' }
          ]
        });
        return;
      }
      // Approved nominations where Alice is a reviewer (task list)
      if (url.includes('status=eq.Approved')) {
        await route.fulfill({
          status: 200,
          json: [
            { id: 'nom-2', requester_id: 'user-id-2', manager_email: 'admin@choco.media', questionnaire_id: 'q-1', title: 'Bob Q1 Review', status: 'Approved', reviewer_ids: ['user-id-1'], created_at: '2024-03-01T00:00:00Z' },
            { id: 'nom-3', requester_id: 'admin-id',  manager_email: 'admin@choco.media', questionnaire_id: 'q-1', title: 'Admin Annual Review', status: 'Approved', reviewer_ids: ['user-id-1'], created_at: '2024-03-02T00:00:00Z' }
          ]
        });
        return;
      }
      await route.fulfill({ status: 200, json: [] });
    });

    // === Mock: system_messages ===
    await page.route('**/*/rest/v1/system_messages*', async (route, request) => {
      if (request.method() !== 'GET') {
        await route.fulfill({ status: 204 });
        return;
      }
      await route.fulfill({
        status: 200,
        json: [
          {
            id: 'msg-1',
            user_id: 'user-id-2',
            content: '請問何時會有暗黑模式？',
            created_at: '2024-03-01T12:00:00Z',
            profiles: { name: 'Bob Jones', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob' }
          }
        ]
      });
    });

    const ref = new URL(process.env.VITE_SUPABASE_URL || 'https://default.supabase.co').hostname.split('.')[0];
    await page.addInitScript((projectRef) => {
      const email = 'alice@choco.media';
      const fakeSession = { access_token: 'fake', refresh_token: 'fake', expires_in: 3600, expires_at: 9999999999, token_type: 'bearer', user: { id: 'test-id', aud: 'authenticated', role: 'authenticated', email, app_metadata: { provider: 'google', providers: ['google'] }, user_metadata: {}, created_at: '2023-01-01T00:00:00.000Z', updated_at: '2023-01-01T00:00:00.000Z' } };
      window.localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(fakeSession));
    }, ref);

    await page.goto('/');
    // wait for dashboard to load
    await expect(page.locator('h1:has-text("歡迎使用 Choco360 👋")')).toBeVisible({ timeout: 10000 });
  });

  // ─────────────── Dashboard Tests ───────────────

  test('總覽面板應正確顯示歡迎詞、IC 權限徽章、與評鑑進度追蹤', async ({ page }) => {
    // 歡迎詞
    await expect(page.locator('h1:has-text("歡迎使用 Choco360 👋")')).toBeVisible();

    // 權限徽章 (Alice 是 IC)
    await expect(page.locator('text=IC / 專業貢獻者')).toBeVisible();

    const main = page.locator('main');

    // 新的追蹤組件
    await expect(main.locator('h2:has-text("我發起的評鑑進度")')).toBeVisible();
    await expect(main.locator('div:has-text("Alice 同儕 360")').first()).toBeVisible();
    await expect(main.locator('span:has-text("主管審核中")').first()).toBeVisible();
    await expect(main.locator('span:has-text("尚未發送邀請")')).toBeVisible();
    await expect(main.locator('button:has-text("提醒主管")')).toBeVisible();
  });

  test('總覽面板應正確渲染 IC 的智慧流程導引與待辦任務', async ({ page }) => {
    const main = page.locator('main');

    // Workflow Guide
    await expect(main.locator('text=如何開始您的評鑑之旅？')).toBeVisible();
    await expect(main.locator('text=身為 IC，您可以發起「同儕專業 360」')).toBeVisible();
    await expect(main.locator('button', { hasText: '立即發起邀請' })).toBeVisible();

    // Action Items: 兩筆任務
    await expect(main.locator('h2', { hasText: '需完成的評鑑任務' })).toBeVisible();
    await expect(main.locator('text=Bob Jones')).toBeVisible();
    await expect(main.locator('text=Bob Q1 Review')).toBeVisible();
    await expect(main.locator('p.font-bold:has-text("Abraham Admin")').first()).toBeVisible();
    await expect(main.locator('text=Admin Annual Review')).toBeVisible();
    await expect(main.locator('button', { hasText: '開始評鑑' })).toHaveCount(2);
  });

  // ─────────────── Profile Tests ───────────────

  test('個人中心應正確顯示唯讀資訊與頭像更新互動', async ({ page }) => {
    // 切換到個人中心
    await page.locator('nav button', { hasText: '個人中心' }).click();
    await expect(page.locator('h1', { hasText: '個人中心' })).toBeVisible();

    const main = page.locator('main');

    // 唯讀欄位
    await expect(main.locator('p', { hasText: 'Alice Smith' }).first()).toBeVisible();
    await expect(main.locator('p', { hasText: 'Frontend Developer' }).first()).toBeVisible();
    await expect(main.locator('p', { hasText: 'Product' }).first()).toBeVisible();

    // 直屬主管 (直屬主管顯示於獨立 div 中)
    await expect(main.locator('text=直屬主管 (名單審核人)')).toBeVisible();
    await expect(main.locator('p:has-text("Abraham Admin")')).toBeVisible();

    // Avatar 互動：刷新 → 出現儲存按鈕 → 取消還原 → 按鈕消失
    const refreshBtn = main.locator('button[title="刷新隨機預覽"]');
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    await expect(main.locator('button', { hasText: '儲存頭像' })).toBeVisible();
    await expect(main.locator('button', { hasText: '取消還原' })).toBeVisible();

    await main.locator('button', { hasText: '取消還原' }).click();
    await expect(main.locator('button', { hasText: '儲存頭像' })).not.toBeVisible();
  });

  test('開發者留言板應正常載入歷史留言並允許發送新留言', async ({ page }) => {
    await page.locator('nav button', { hasText: '個人中心' }).click();

    const main = page.locator('main');
    await expect(main.locator('h2', { hasText: '開發者留言板' })).toBeVisible();
    await expect(main.locator('text=1 則留言')).toBeVisible();
    await expect(main.locator('text=Bob Jones')).toBeVisible();
    await expect(main.locator('text=請問何時會有暗黑模式？')).toBeVisible();

    // 發送留言
    const textarea = main.locator('textarea[placeholder*="有什麼話想對開發者說嗎"]');
    await textarea.fill('測試留言123');
    const submitBtn = main.locator('button', { hasText: '送出留言' });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // textarea 清空
    await expect(textarea).toHaveValue('', { timeout: 3000 });
  });

});
