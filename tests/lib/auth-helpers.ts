
import { Page, expect } from '@playwright/test';

/**
 * 透過開發者模式模擬登入
 * @param page Playwright Page 物件
 * @param email 登入 Email (會自動附帶 #gyadmin 指令)
 */
export async function loginAs(page: Page, email: string) {
  await page.goto('/');
  
  // 1. 點擊 Logo 五次觸發開發者控制台
  const logo = page.locator('button:has-text("C")');
  for (let i = 0; i < 5; i++) {
    await logo.click();
  }
  
  // 2. 填寫模擬 Email 並登入
  const devEmail = `${email}#gyadmin`;
  await page.fill('input[placeholder*="Email"]', devEmail);
  await page.click('button:has-text("進入模擬模式")');
  
  // 3. 驗證是否成功進入 Dashboard (檢查是否有登出按鈕或 Layout 元件)
  await expect(page.locator('text=總覽面版')).toBeVisible({ timeout: 10000 });
  console.log(`成功以 ${email} 模擬登入`);
}
