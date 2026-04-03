import { test, expect } from '../coverage-fixtures';

test.describe('02. Admin Configuration - Comprehensive Tests', () => {

  test.beforeEach(async ({ page }) => {
    // 建立基礎 Mock 資料讓系統能無縫登入為 Admin 並讀取列表
    await page.route('**/*/rest/v1/profiles*', async (route, request) => {
      const url = request.url();
      const method = request.method();

      if (method === 'PATCH' || method === 'POST' || method === 'DELETE') {
        await route.fulfill({ status: 204 });
        return;
      }

      if (url.includes('email=eq.admin')) {
        await route.fulfill({
          status: 200,
          json: [{ id: 'admin-id', name: 'Abraham Admin', email: 'admin@choco.media', role: 'CTO', department: 'Executive', is_system_admin: true, is_manager: true }]
        });
        return;
      }
      
      await route.fulfill({
        status: 200,
        json: [
          { id: 'admin-id', name: 'Abraham Admin', email: 'admin@choco.media', role: 'CTO', department: 'Executive', is_system_admin: true, is_manager: true },
          { id: 'user-id-1', name: 'Alice', email: 'alice@choco.media', role: 'Developer', department: 'Product', is_system_admin: false, is_manager: false, manager_email: 'admin@choco.media' },
          { id: 'user-id-2', name: 'Bob', email: 'bob@choco.media', role: 'Designer', department: 'Product', is_system_admin: false, is_manager: false, manager_email: 'admin@choco.media' }
        ]
      });
    });

    await page.route('**/*/rest/v1/questionnaires*', async (route, request) => {
      if (request.method() !== 'GET') {
        await route.fulfill({ status: 200, json: [] });
        return;
      }
      await route.fulfill({
        status: 200,
        json: [
          { id: 'q-1', title: 'Q1 Performance Review', description: 'desc 1', active: true, dimensions: [] },
          { id: 'q-2', title: 'Q2 Peer Review', description: 'desc 2', active: false, dimensions: [] }
        ]
      });
    });

    await page.route('**/*/rest/v1/nominations*', async (route, request) => {
      if (request.method() !== 'GET') {
        await route.fulfill({ status: 200, json: [] });
        return;
      }
      await route.fulfill({
        status: 200,
        json: [
          { id: 'nom-1', requesterId: 'user-id-1', managerId: 'admin@choco.media', questionnaireId: 'q-1', title: 'Alice Review', status: 'Approved', reviewerIds: ['user-id-2'] },
          { id: 'nom-2', requesterId: 'user-id-2', managerId: 'admin@choco.media', questionnaireId: 'q-1', title: 'Bob Review', status: 'Rejected', reviewerIds: [] }
        ]
      });
    });

    await page.route('**/*/rest/v1/feedback_entries*', async (route, request) => {
      if (request.method() !== 'GET') {
        await route.fulfill({ status: 200, json: [] });
        return;
      }
      await route.fulfill({
        status: 200,
        json: [
          { id: 'fb-1', nominationId: 'nom-1', fromUserId: 'user-id-2', targetUserId: 'user-id-1', status: 'submitted' }
        ]
      });
    });

    await page.route('**/*/auth/v1/user*', async (route) => {
      await route.fulfill({
        status: 200,
        json: { id: 'admin-id', email: 'admin@choco.media' }
      });
    });

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err));

    // Inject localStorage and wait for login
    const ref = new URL(process.env.VITE_SUPABASE_URL || 'https://default.supabase.co').hostname.split('.')[0];
    await page.addInitScript((projectRef) => {
      const fakeSession = {
        access_token: 'fake_access_token',
        refresh_token: 'fake_refresh_token',
        expires_in: 3600,
        expires_at: 9999999999,
        token_type: 'bearer',
        user: {
          id: 'admin-id',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'admin@choco.media',
          app_metadata: { provider: 'google', providers: ['google'] },
          user_metadata: {},
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z'
        }
      };
      window.localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(fakeSession));
    }, ref);

    await page.goto('/');
    await page.click('text=控制中心');
  });

  test('活動監控 (Activity Monitoring) 應正確顯示狀態與按鈕', async ({ page }) => {
    // 預設進入控制中心就是「活動監控」
    await expect(page.locator('text=全域活動儀表板')).toBeVisible();

    // 驗證進行中的問卷
    const mainArea = page.locator('main');
    await expect(mainArea.locator('text=Alice Review')).toBeVisible();
    await expect(mainArea.locator('text=Bob Review')).toBeVisible();

    // 驗證狀態標籤 (Alice 有 1 個 reviewer 且已經 submitted，所以預期進度是 1/2，狀態是 "進行中")
    // 因為自己還沒填寫
    await expect(mainArea.locator('span:has-text("進行中")')).toBeVisible();
    await expect(mainArea.locator('span:has-text("已駁回")')).toBeVisible();

    // 驗證操作按鈕 title (Playwright 可以用 HTML title 屬性定位)
    await expect(page.locator('button[title="刪除問卷"]').first()).toBeVisible();
    await expect(page.locator('button[title="調整名單與移轉主管"]').first()).toBeVisible();
  });

  test('員工管理 (User Management) 應能正確渲染列表與處理過濾 Drawer', async ({ page }) => {
    // 切換到員工管理
    await page.click('text=員工管理');
    
    // 驗證列表是否渲染
    const mainArea = page.locator('main');
    await expect(mainArea.locator('text=Abraham Admin').first()).toBeVisible();
    await expect(mainArea.locator('text=Alice').first()).toBeVisible();
    await expect(mainArea.locator('text=Bob').first()).toBeVisible();

    // 驗證搜尋過濾 (打 Alice，Bob 應該消失)
    await mainArea.locator('input[placeholder="搜尋姓名或信箱..."]').fill('Alice');
    await expect(mainArea.locator('text=Bob').first()).not.toBeVisible();
    await expect(mainArea.locator('text=Alice').first()).toBeVisible();

    // 清空搜尋
    await mainArea.locator('input[placeholder="搜尋姓名或信箱..."]').fill('');

    // 點擊新增員工，確認抽屜開啟
    await mainArea.locator('button:has-text("新增員工")').click();
    await expect(page.locator('h2:has-text("新增員工")')).toBeVisible();
    
    // 確認必須欄位存在
    await expect(page.locator('label:has-text("顯示姓名")')).toBeVisible();
    await expect(page.locator('label:has-text("公司信箱")')).toBeVisible();
    const cancelBtn = page.locator('button:has-text("取消")');
    await cancelBtn.click();
  });

  test('問卷設計 (Form Management) 應能正確渲染列表與狀態', async ({ page }) => {
    // 切換到問卷設計
    await page.click('button:has-text("問卷設計")');

    // 驗證標題與按鈕
    await expect(page.locator('h2:has-text("問卷版本庫")')).toBeVisible();
    await expect(page.locator('button:has-text("建立新問卷")')).toBeVisible();

    // 驗證資料渲染與狀態徽章
    await expect(page.locator('h3:has-text("Q1 Performance Review")')).toBeVisible();
    await expect(page.locator('button:has-text("使用中")')).toBeVisible();
    
    await expect(page.locator('h3:has-text("Q2 Peer Review")')).toBeVisible();
    await expect(page.locator('button:has-text("已停用")')).toBeVisible();

    // 點擊編輯按鈕
    await page.locator('button:has-text("編輯問卷")').first().click();
    await expect(page.locator('h2:has-text("編輯問卷架構")')).toBeVisible();
  });


});
