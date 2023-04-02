const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  context: __dirname,
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
  },

  module: {
    rules: [
      {
        // Run Eslint before compile
        test: /\.(js|jsx)$/,
        include: [__dirname, path.resolve(__dirname, '../', 'src')],
        exclude: /node_modules/,
        enforce: 'pre',
        loader: 'eslint-loader',
      },

      {
        test: /\.(js|jsx)$/,
        include: [__dirname, path.resolve(__dirname, '../', 'src')],
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },

  resolve: {
    alias: {
      'bigdata-react-tendency-chart': path.join(
        __dirname,
        '..',
        'src/index.js'
      ),
    },
    extensions: ['.js', '.jsx', '.json'],
  },

  plugins: [
    new HtmlWebpackPlugin({
      // 打包输出HTML
      title: 'Tendency Chart Demo',
      filename: 'index.html',
      template: path.resolve(__dirname, './index.html'),
    }),
  ],
};
