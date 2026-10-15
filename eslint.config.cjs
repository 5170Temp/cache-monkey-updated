const vue = require('eslint-plugin-vue');

module.exports = [
  { ignores: ['dist/**', 'build/**', 'node_modules/**'] },
  ...vue.configs['flat/base'],
  {
    files: ['src/**/*.{js,vue}', 'test/**/*.js', 'webpack.renderer.config.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        require: 'readonly', module: 'readonly', __dirname: 'readonly',
        process: 'readonly', console: 'readonly', Buffer: 'readonly',
        window: 'readonly', document: 'readonly', localStorage: 'readonly',
        setTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly'
      }
    }
  }
];
