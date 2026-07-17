import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// 启动时读 .env.local（Vite 原生支持），优先级：shell 环境变量 > .env.local > 兜底 LAN IP。
// .env.local 由 scripts/local_ip.sh write 自动生成；网络变了跑一次即可。
const FALLBACK_API_TARGET = 'http://192.168.1.2:8000';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const API_TARGET = env.VITE_API_TARGET || process.env.VITE_API_TARGET || FALLBACK_API_TARGET;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: API_TARGET,
          changeOrigin: true,
        },
        '/static': {
          target: API_TARGET,
          changeOrigin: true,
        },
      },
    },
  };
});