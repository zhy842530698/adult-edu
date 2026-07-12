import { defineConfig } from '@tarojs/cli';

export default defineConfig(async (ctx, env) => {
  return {
    projectName: 'adult-edu',
    date: '2026-7-13',
    designWidth: 750,
    deviceRatio: { 640: 2.34 / 2, 750: 1, 828: 1.81 / 2, 375: 2 / 1 },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: ['@tarojs/plugin-framework-react'],
    defineConstants: {},
    copy: { patterns: [], options: {} },
    framework: 'react',
    compiler: 'webpack5',
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
});