import { vi } from 'vitest';

// 模擬 import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_GEMINI_API_KEY: 'test-api-key',
    },
  },
});

// 如果 vite-plugin-environment 不在環境中，我們直接在 global 設置
(globalThis as any).importMetaEnv = {
  VITE_GEMINI_API_KEY: 'test-api-key',
};

// 處理 vitest 中的 import.meta.env 存取
Object.defineProperty(globalThis, 'import.meta', {
  value: {
    env: {
      VITE_GEMINI_API_KEY: 'test-api-key',
    }
  },
  configurable: true,
});
