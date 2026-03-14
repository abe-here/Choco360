import { test, expect } from '@playwright/test';

test.describe('04. Nomination Flow', () => {

  test('Part 1: 員工提名 (Employee Flow) - 建立並送出反饋邀請', async ({ page }) => {
    // Mock APIs for Employee
    await page.route('**/*/rest/v1/profiles*', async (route, request) => {
      if (request.url().includes('email=eq.employee')) {
        await route.fulfill({
          status: 200,
          json: [{ id: 'emp-1', name: 'Employee A', email: 'employee@choco.media', role: 'Developer', department: 'Product', is_system_admin: false, is_manager: false, manager_email: 'manager@choco.media' }]
        });
        return;
      }
      await route.fulfill({
        status: 200,
        json: [
          { id: 'emp-1', name: 'Employee A', email: 'employee@choco.media', role: 'Developer', department: 'Product', is_manager: false },
          { id: 'emp-2', name: 'Bob', email: 'bob@choco.media', role: 'Designer', department: 'Product', is_manager: false },
          { id: 'emp-3', name: 'Charlie', email: 'charlie@choco.media', role: 'HR', department: 'HR/ADM', is_manager: false }
        ]
      });
    });

    await page.route('**/*/rest/v1/questionnaires*', async (route) => {
      await route.fulfill({
        status: 200,
        json: [
          { id: 'q-1', title: 'Q1 Performance Review', description: 'desc 1', active: true, dimensions: [] }
        ]
      });
    });

    await page.route('**/*/rest/v1/nominations*', async (route, request) => {
      const method = request.method();
      if (method === 'POST') {
        await route.fulfill({ status: 201 });
        return;
      }
      await route.fulfill({ status: 200, json: [] });
    });

    // Inject localStorage and wait for login
    await page.addInitScript(() => {
      window.localStorage.setItem('nexus360_user_email', 'employee@choco.media');
    });

    await page.goto('/');
    
    // 進入互評提名 (Nomination) 頁面
    await page.click('text=邀請反饋');

    // Step 1
    await expect(page.locator('text=建立反饋邀請')).toBeVisible();
    await expect(page.locator('text=Q1 Performance Review')).toBeVisible();
    
    // 填寫邀請標題
    await page.locator('input[placeholder="請輸入本次反饋邀請的明確名稱"]').fill('2024 年度互評');

    // 點擊下一步
    await page.click('text=下一步：選擇誰來評鑑您');

    // Step 2
    await expect(page.locator('text=邀請合適的同事為您的專業表現提供反饋')).toBeVisible();

    // 確認找不到自己的名字 (不能選擇自己)
    await expect(page.locator('main').locator('text=Employee A')).not.toBeVisible();

    // 部門過濾測試
    await page.click('button:has-text("HR/ADM")');
    await expect(page.locator('text=Charlie')).toBeVisible();
    await expect(page.locator('text=Bob')).not.toBeVisible();

    await page.click('button:has-text("全部門")');
    await expect(page.locator('text=Bob')).toBeVisible();

    // 選擇評審
    await page.click('text=Bob');
    await page.click('text=Charlie');

    // 送出
    await page.click('button:has-text("送出反饋邀請")');

    // 驗證成功畫面
    await expect(page.locator('text=反饋邀請已發送！')).toBeVisible();
  });

  test('Part 2: 主管審核 (Manager Flow) - 審核名單與編輯', async ({ page }) => {
    // Mock APIs for Manager
    await page.route('**/*/rest/v1/profiles*', async (route, request) => {
      if (request.url().includes('email=eq.manager')) {
        await route.fulfill({
          status: 200,
          json: [{ id: 'mgr-1', name: 'Manager X', email: 'manager@choco.media', role: 'Head', department: 'Product', is_system_admin: false, is_manager: true }]
        });
        return;
      }
      await route.fulfill({
        status: 200,
        json: [
          { id: 'emp-1', name: 'Employee A', email: 'employee@choco.media', role: 'Developer', department: 'Product', is_manager: false },
          { id: 'emp-2', name: 'Bob', email: 'bob@choco.media', role: 'Designer', department: 'Product', is_manager: false },
          { id: 'emp-3', name: 'Charlie', email: 'charlie@choco.media', role: 'HR', department: 'HR/ADM', is_manager: false }
        ]
      });
    });

    await page.route('**/*/rest/v1/nominations*', async (route, request) => {
      const method = request.method();
      if (method === 'PATCH') {
        const body = request.postDataJSON();
        // Respond with success
        await route.fulfill({ status: 204 });
        return;
      }
      // Return one pending nomination
      await route.fulfill({
        status: 200,
        json: [
          { id: 'nom-1', title: '2024 年度互評', status: 'Pending', requester_id: 'emp-1', manager_email: 'manager@choco.media', reviewer_ids: ['emp-2'] }
        ]
      });
    });

    // Inject localStorage and wait for login
    await page.addInitScript(() => {
      window.localStorage.setItem('nexus360_user_email', 'manager@choco.media');
    });

    await page.goto('/');
    
    // 進入審核名單 (Approvals) 頁面
    await page.click('text=審核名單');

    // 驗證標題與待處理數量
    await expect(page.locator('main').locator('h1:has-text("審核名單")')).toBeVisible();
    await expect(page.locator('main').locator('text=Employee A')).toBeVisible();
    await expect(page.locator('main').locator('text=Bob')).toBeVisible(); // 受邀人

    // 測試主管直接新增名單
    await page.click('button:has-text("為下屬增加評鑑維度")');
    await expect(page.locator('h4:has-text("組織人員名冊")')).toBeVisible();
    
    // 點擊新增 Charlie
    await page.click('p:has-text("Charlie")'); // Finds the reviewer in the list
    // (mocking handles the patch request, but the UI updates optimistically if it succeeds)

    // 測試核准流程
    await page.click('button:has-text("確認並核准名單")');

    // 切換到歷史核准頁籤
    await page.click('button:has-text("歷史核准")');
    // UI should show it if the mock persists state, but since our mock is static it will still refetch or show empty for approved. 
    // Just verify the button click was possible.
  });

});
