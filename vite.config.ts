import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import istanbul from 'vite-plugin-istanbul';

// Fix: Define __dirname for ESM environment to resolve the "Cannot find name '__dirname'" error
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/slack': {
            target: 'https://slack.com/api',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/slack/, ''),
          }
        }
      },
      build: {
        sourcemap: true,
      },
      plugins: [
        react(),
        istanbul({
          include: ['App.tsx', 'components/*', 'services/*', 'constants.tsx', 'index.tsx', 'types.ts'],
          exclude: ['node_modules', 'tests/*'],
          extension: ['.ts', '.tsx'],
          requireEnv: true, // Only instrument when VITE_COVERAGE is set
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
