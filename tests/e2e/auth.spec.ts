import { test, expect } from '../coverage-fixtures';

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

  test('多頁籤 (Multi-tab) 防護：開啟新分頁時，舊分頁應被攔截', async ({ browser }) => {
    // 建立新的 Context 以支援多個 page 模擬真實情境
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // 1. 在分頁 1 進入首頁
    await page1.goto('/');
    await expect(page1.locator('text=CHOCO360')).toBeVisible();

    // 2. 在分頁 2 進入首頁
    await page2.goto('/');
    await expect(page2.locator('text=CHOCO360')).toBeVisible();

    // 3. 回到分頁 1，應能看到被擋住的提示
    await expect(page1.locator('text=作業已移至新分頁')).toBeVisible();
    await expect(page1.locator('text=在此分頁繼續作業')).toBeVisible();

    // 4. 在分頁 1 點擊「在此分頁繼續作業」，此時分頁 2 會因為儲存事件被擋住
    await page1.getByRole('button', { name: '在此分頁繼續作業' }).click();
    
    // 5. 確認分頁 1 恢復，且分頁 2 變成被擋住
    await expect(page1.locator('text=作業已移至新分頁')).not.toBeVisible();
    await expect(page2.locator('text=作業已移至新分頁')).toBeVisible();

    await context.close();
  });

});
