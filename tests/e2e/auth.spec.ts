import { test, expect } from '@playwright/test';

test.describe('01. Authentication & Core Architecture', () => {

  test('訪客進入首頁應看到 Google 登入按鈕且隱藏特定網域提示', async ({ page }) => {
    // 1. 訪客 (未登入) 進入 http://localhost:3000
    await page.goto('/');

    // 2. 系統檢測到無可用 Session，顯示「Google 帳戶登入」畫面
    await expect(page.locator('text=CHOCO360')).toBeVisible();
    await expect(page.locator('text=INTERNAL GROWTH PLATFORM')).toBeVisible();

    // 確定有 Google Login Button Container
    const googleLoginContainer = page.locator('#googleLoginBtn');
    await expect(googleLoginContainer).toBeVisible();

    // 確定畫面【沒有】寫死內部網域，以防資訊外洩
    await expect(page.locator('text=僅限 @choco.media 網域員工存取')).not.toBeVisible();
    await expect(page.locator('text=@choco.media')).not.toBeVisible();
  });

});
