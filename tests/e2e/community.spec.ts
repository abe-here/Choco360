import { test, expect } from '../coverage-fixtures';

test.describe('Community Hub - 社群交流 (Beta)', () => {

  test.beforeEach(async ({ page }) => {
    // === Mock: profiles ===
    await page.route('**/*/rest/v1/profiles*', async (route, request) => {
      const method = request.method();
      if (method === 'PATCH' || method === 'POST' || method === 'DELETE') {
        await route.fulfill({ status: 204 });
        return;
      }
      const isSingle = request.headers()['accept']?.includes('vnd.pgrst.object');
      if (request.url().includes('email=eq.alice')) {
        const d = { id: 'user-id-1', name: 'Alice Smith', email: 'alice@choco.media', role: 'Frontend Developer', department: 'Product', is_system_admin: false, is_manager: false, status: 'active', motto: 'Build fast, break nothing.', unlocked_superpowers: [], active_superpower_id: null, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice' };
        await route.fulfill({ status: 200, json: isSingle ? d : [d] });
        return;
      }
      await route.fulfill({
        status: 200,
        json: [
          { id: 'user-id-1', name: 'Alice Smith', email: 'alice@choco.media', role: 'Frontend Developer', department: 'Product', is_system_admin: false, is_manager: false, status: 'active', motto: 'Build fast, break nothing.', unlocked_superpowers: [{ id: 'sp-1', title: 'THE CODE SORCERER', category: 'strategic', description: '技術深度卓越。' }], active_superpower_id: 'sp-1', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice' },
          { id: 'user-id-2', name: 'Bob Jones', email: 'bob@choco.media', role: 'Designer', department: 'Design', is_system_admin: false, is_manager: false, status: 'active', motto: 'Design for humans.', unlocked_superpowers: [], active_superpower_id: null, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob' },
          { id: 'user-id-ex', name: 'Carol Ex', email: 'carol@choco.media', role: 'Engineer', department: 'Eng', is_system_admin: false, is_manager: false, status: 'resigned', motto: null, unlocked_superpowers: [], active_superpower_id: null, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carol' },
        ]
      });
    });

    await page.route('**/*/rest/v1/nominations*', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });
    await page.route('**/*/rest/v1/feedbacks*', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });
    await page.route('**/*/rest/v1/system_messages*', async (route) => {
      await route.fulfill({ status: 200, json: [] });
    });

    const ref = new URL(process.env.VITE_SUPABASE_URL || 'https://default.supabase.co').hostname.split('.')[0];
    await page.addInitScript((projectRef) => {
      const email = 'alice@choco.media';
      const fakeSession = { access_token: 'fake', refresh_token: 'fake', expires_in: 3600, expires_at: 9999999999, token_type: 'bearer', user: { id: 'user-id-1', aud: 'authenticated', role: 'authenticated', email, app_metadata: { provider: 'google', providers: ['google'] }, user_metadata: {}, created_at: '2023-01-01T00:00:00.000Z', updated_at: '2023-01-01T00:00:00.000Z' } };
      window.localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(fakeSession));
    }, ref);

    await page.goto('/');
    await expect(page.locator('h1:has-text("歡迎使用 Choco360 👋")')).toBeVisible({ timeout: 10000 });
    await page.locator('nav button', { hasText: '社群交流' }).click();
    await expect(page.locator('h1', { hasText: 'Choco Community' })).toBeVisible({ timeout: 5000 });
  });

  test('應顯示「實驗功能預覽」標籤', async ({ page }) => {
    await expect(page.locator('text=實驗功能預覽 (Under Construction)')).toBeVisible();
  });

  test('應顯示在職員工的卡片，但不顯示離職員工', async ({ page }) => {
    const main = page.locator('main');

    // 在職員工應顯示
    await expect(main.locator('h3:has-text("Alice Smith")')).toBeVisible();
    await expect(main.locator('h3:has-text("Bob Jones")')).toBeVisible();

    // 離職員工 (Carol Ex, status=resigned) 不應顯示
    await expect(main.locator('h3:has-text("Carol Ex")')).not.toBeVisible();
  });

  test('員工卡片應顯示格言 (motto)', async ({ page }) => {
    const main = page.locator('main');
    await expect(main.locator('text=Build fast, break nothing.')).toBeVisible();
    await expect(main.locator('text=Design for humans.')).toBeVisible();
  });

  test('搜尋列應能過濾成員', async ({ page }) => {
    const main = page.locator('main');
    const searchInput = main.locator('input[placeholder*="搜尋夥伴"]');
    await expect(searchInput).toBeVisible();

    // 搜尋 Alice
    await searchInput.fill('Alice');
    await expect(main.locator('h3:has-text("Alice Smith")')).toBeVisible();
    await expect(main.locator('h3:has-text("Bob Jones")')).not.toBeVisible();

    // 清空後兩人都回來
    await searchInput.fill('');
    await expect(main.locator('h3:has-text("Bob Jones")')).toBeVisible();
  });

});
