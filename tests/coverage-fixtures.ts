import { test as base } from '@playwright/test';
import { addCoverageReport } from 'monocart-reporter';

export const test = base.extend({
  page: async ({ page }, use) => {
    await use(page);

    // Collect coverage after each test
    if (process.env.VITE_COVERAGE) {
      const coverage = await page.evaluate(() => (window as any).__coverage__);
      if (coverage) {
        console.log(`[Coverage] Collected coverage for ${test.info().title}`);
        await addCoverageReport(coverage, test.info());
      } else {
        console.log(`[Coverage] No coverage found for ${test.info().title}`);
      }
    }
  },
});

export { expect } from '@playwright/test';
