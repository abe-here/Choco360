import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // 流程有順序性，建議關閉平行執行
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // 資料庫共享時，建議單線程執行
  reporter: [
    ['html'],
    ['monocart-reporter', {
      name: 'Choco360 Coverage Report',
      outputDir: './playwright-report',
      reports: [
        ['v8'],
        ['console-details'],
        'istanbul'
      ],
      coverage: {
        entryFilter: (entry) => entry.url.indexOf('localhost:3000') !== -1,
        sourceFilter: (sourcePath) => sourcePath.search(/node_modules|tests/) === -1,
        lcov: true,
        html: true
      }
    }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      VITE_COVERAGE: 'true',
    },
  },
});
