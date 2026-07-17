import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import type { IProjectConfig } from '@tarojs/taro';

// 构建时读 .env.local（如果存在），让 TARO_APP_API_BASE / VITE_API_TARGET 可配置。
// 优先级：shell 环境变量 > .env.local > 兜底默认 LAN IP。
// .env.local 由 scripts/local_ip.sh write 自动生成；网络变了跑一次即可。
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

const FALLBACK_API_BASE = 'http://192.168.1.2:8000/api/v1';
const FALLBACK_API_TARGET = 'http://192.168.1.2:8000';
const API_BASE = process.env.TARO_APP_API_BASE || FALLBACK_API_BASE;
const API_TARGET = process.env.VITE_API_TARGET || FALLBACK_API_TARGET;

// Taro 3.6.7 CLI 会把 export default 当成函数调用，把命令行参数 merge 进来
export default function (merge, env: any = {}): IProjectConfig {
  const base: IProjectConfig = {
    projectName: 'adult-edu',
    date: '2026-7-13',
    designWidth: 750,
    deviceRatio: { 640: 2.34 / 2, 750: 1, 828: 1.81 / 2, 375: 2 / 1 },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: ['@tarojs/plugin-framework-react'],
    defineConstants: {
      'process.env.TARO_APP_API_BASE': JSON.stringify(API_BASE),
    },
    copy: { patterns: [], options: {} },
    framework: 'react',
    compiler: {
    type: 'webpack5',
    prebundle: {
      enable: false,
    },
  },
    cache: { enable: false },
    sass: { resource: [] },
    mini: {
      webpackChain(chain: any) { /* noop */ },
      postcss: { autoprefixer: { enable: true } },
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      output: { filename: 'js/[name].[hash:8].js', chunkFilename: 'js/[name].[chunkhash:8].js' },
      miniCssExtractPluginOption: { ignoreOrder: true, filename: 'css/[name].[hash].css' },
      postcss: { autoprefixer: { enable: true } },
      devServer: { port: 10086, host: '0.0.0.0', proxy: { '/api': { target: API_TARGET, changeOrigin: true } } },
    },
  };
  return merge({}, base, { _: [] });
}