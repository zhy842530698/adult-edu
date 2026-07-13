// module.exports = {
//   presets: [
//     ['taro', { framework: 'react', ts: true, useBuiltIns: 'usage' }],
//   ],
// };
module.exports = {
  presets: [
    [
      'taro',
      {
        framework: 'react',
        ts: true,

        // 微信小程序端不要注入 core-js runtime
        // 只有 H5 端才按需引入
        useBuiltIns:
          process.env.TARO_ENV === 'h5'
            ? 'usage'
            : false
      }
    ]
  ]
}