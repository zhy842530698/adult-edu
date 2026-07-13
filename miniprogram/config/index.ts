import type { IProjectConfig } from '@tarojs/taro';

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
      'process.env.TARO_APP_API_BASE': JSON.stringify(
        process.env.TARO_APP_API_BASE || 'http://127.0.0.1:8000/api/v1',
      ),
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
      devServer: { port: 10086, host: '0.0.0.0', proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true } } },
    },
  };
  return merge({}, base, { _: [] });
}