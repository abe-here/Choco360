import { test, expect } from '../coverage-fixtures';

test.describe('Admin Reports View', () => {

  const adminUser = {
    id: 'emp-admin', name: 'Admin Boss', email: 'admin@choco.media',
    role: 'CTO', department: 'Executive', is_system_admin: true,
    is_manager: true, manager_email: 'ceo@choco.media',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
  };

  const employeeUser = {
    id: 'emp-1', name: 'Employee A', email: 'employee@choco.media',
    role: 'Developer', department: 'Product', is_system_admin: false,
    is_manager: false, manager_email: 'admin@choco.media',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=employee'
  };

  const mockQuestionnaires = [
    { id: 'q-1', title: 'Performance Review', active: true, dimensions: [{ id: 'dim-1', name: 'Teamwork', purpose: 'x', questions: [{ id: 'q1', text: 'Text', question_type: 'rating' }] }] }
  ];

  test.beforeEach(async ({ page }) => {
    await page.route('**/*/rest/v1/profiles*', async (route, request) => {
      const url = request.url();
      if (request.method() !== 'GET') { await route.fulfill({ status: 204 }); return; }
      if (url.includes('email=eq.admin')) { await route.fulfill({ status: 200, json: [adminUser] }); return; }
      await route.fulfill({ status: 200, json: [adminUser, employeeUser] }); // When getting all users and self
    });

    await page.route('**/*/rest/v1/questionnaires*', async (route) => {
      await route.fulfill({ status: 200, json: mockQuestionnaires });
    });

    await page.route('**/*/rest/v1/feedbacks*', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });

    await page.route('**/*/rest/v1/nominations*', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });

    const ref = new URL(process.env.VITE_SUPABASE_URL || 'https://default.supabase.co').hostname.split('.')[0];
    await page.addInitScript((projectRef) => {
      const fakeSession = { access_token: 'fake', refresh_token: 'fake', expires_in: 3600, expires_at: 9999999999, token_type: 'bearer', user: { id: 'emp-admin', email: 'admin@choco.media', app_metadata: { provider: 'google', providers: ['google'] }, user_metadata: {} } };
      window.localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(fakeSession));
    }, ref);

    await page.goto('/');
    await page.locator('nav button', { hasText: '我的報告' }).click();
  });

  test('管理員可切換視角檢視他人報告並觸發提示', async ({ page }) => {
    await expect(page.locator('h1:has-text("個人成長報告")')).toBeVisible();
    await expect(page.locator('text=管理員視角：切換人員')).toBeVisible();

    const select = page.locator('select').first();
    await select.selectOption({ label: 'Employee A' });
    
    // Check if new user is rendered
    // If there's no nominations, it will say "尚無歷史報告"
    await expect(page.locator('select').nth(1)).toHaveText(/尚無歷史報告/);

    // Check click on generate insight
    let alertMsg = '';
    page.once('dialog', async dialog => {
      alertMsg = dialog.message();
      await dialog.dismiss();
    });

    await page.locator('button:has-text("生成 AI 洞察")').click();
    await page.waitForTimeout(500);
    expect(alertMsg).toContain('數據不足');
  });

});
