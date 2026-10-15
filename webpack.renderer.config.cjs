const path = require('node:path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');

module.exports = {
  target: 'electron-renderer',
  entry: './src/renderer/main.js',
  output: {
    path: path.resolve(__dirname, 'dist/electron'),
    filename: 'renderer.js',
    clean: true
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.js', '.vue', '.json'],
    alias: { '@': path.resolve(__dirname, 'src/renderer') }
  },
  externals: {
    '@electron/remote': 'commonjs @electron/remote',
    '@ffmpeg-installer/ffmpeg': 'commonjs @ffmpeg-installer/ffmpeg'
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      { test: /\.s?css$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      { test: /\.(png|jpe?g|gif|svg|woff2?)$/, type: 'asset/resource' }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      __VUE_OPTIONS_API__: JSON.stringify(true),
      __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false)
    }),
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      templateContent: '<!doctype html><html><head><meta charset="utf-8"><title>Cache Monkey</title></head><body><div id="app"></div></body></html>'
    })
  ],
  devServer: {
    host: '127.0.0.1',
    port: 9080,
    hot: true,
    static: path.resolve(__dirname, 'dist/electron')
  }
};
