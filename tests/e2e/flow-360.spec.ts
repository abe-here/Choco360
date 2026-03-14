
import { test, expect } from '@playwright/test';
import { cleanTestData, getNominationStatus } from '../lib/db-helper';
import { loginAs } from '../lib/auth-helpers';

test.describe('Choco360 核心路徑端到端測試', () => {
  const ADMIN_EMAIL = 'admin@choco.media';
  const MANAGER_EMAIL = 'abraham.chien@choco.media';

  // 測試前清理數據
  test.beforeAll(async () => {
    await cleanTestData([ADMIN_EMAIL, MANAGER_EMAIL]);
  });

  test('完成 [提名 -> 審核 -> 雙向填寫 -> 落差分析] 完整閉環', async ({ browser }) => {
    // 建立兩個身分的獨立瀏覽器視窗
    const adminContext = await browser.newContext();
    const managerContext = await browser.newContext();
    
    const adminPage = await adminContext.newPage();
    const managerPage = await managerContext.newPage();

    // ---- STEP 1: Admin 登入並發起提名 ----
    await loginAs(adminPage, ADMIN_EMAIL);
    await adminPage.click('text=邀請反饋');
    
    // 選擇問卷
    await adminPage.click('text=Choco360 - 卓越成長評鑑');
    // 搜尋 Abraham 並加入
    await adminPage.fill('input[placeholder*="搜尋同事"]', 'Abraham');
    await adminPage.click('button:has-text("Abraham Chien")');
    // 送出邀請
    await adminPage.click('button:has-text("送出反饋邀請")');
    await expect(adminPage.locator('text=反饋邀請已發送')).toBeVisible();

    // ---- STEP 2: Manager (Abraham) 登入並核准 ----
    await loginAs(managerPage, MANAGER_EMAIL);
    await managerPage.click('text=審核名單');
    await managerPage.click('button:has-text("確認並核准名單")');
    console.log('Abraham 已核准 Admin 的名單');

    // ---- STEP 3: 雙向評價填寫 ----
    
    // A. Abraham 填寫對 Admin 的評價 (設定為 4 分)
    await managerPage.click('text=填寫反饋');
    await managerPage.click('button:has-text("開始填寫")');
    
    // 模擬所有量分題點選 4 分
    const fourRatingButtons = await managerPage.locator('button:has-text("(4)")').all();
    for (const btn of fourRatingButtons) {
      await btn.click();
    }
    await managerPage.click('button:has-text("完成填寫並送出")');
    await expect(managerPage.locator('text=反饋提交成功')).toBeVisible();

    // B. Admin 進行自評 (設定為 2 分，創造落差)
    await adminPage.reload(); // 重新讀取 Dashboard 獲取新任務
    await adminPage.click('text=填寫反饋');
    await adminPage.click('button:has-text("開始填寫")');
    
    // 模擬所有量分題點選 2 分
    const twoRatingButtons = await adminPage.locator('button:has-text("(2)")').all();
    for (const btn of twoRatingButtons) {
      await btn.click();
    }
    await adminPage.click('button:has-text("完成填寫並送出")');
    await expect(adminPage.locator('text=反饋提交成功')).toBeVisible();

    // ---- STEP 4: 報表驗證 ----
    await adminPage.click('text=我的報告');
    
    // 1. 驗證雷達圖是否生成 (SVG polygon 數量)
    // 應該會有 2 個多邊形 (自評 + 他評)
    await expect(adminPage.locator('svg polygon')).toHaveCount(7); // 5個網格 + 2個數據層
    
    // 2. 驗證數值落差
    // 頁面上應該同時出現 2.0 (自評平均) 與 4.0 (他評平均)
    await expect(adminPage.locator('text=2.0')).toBeVisible();
    await expect(adminPage.locator('text=4.0')).toBeVisible();
    
    // 3. 驗證顏色樣式 (2分應該是 rose 玫瑰紅配色)
    const selfScoreCircle = adminPage.locator('div:has-text("2.0")').first();
    await expect(selfScoreCircle).toHaveClass(/text-indigo-600/); // 這裡是自評區塊的顏色
    
    console.log('E2E 流程驗證成功：落差數據正確顯示');
  });
});
