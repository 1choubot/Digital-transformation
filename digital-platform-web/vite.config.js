import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Default local development traffic to the API server that runs on this machine.
  const proxyTarget = env.VITE_API_PROXY_TARGET || env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';

  return {
    plugins: [vue()],
    server: {
      port: 5174,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true
        }
      }
    }
  };
});
