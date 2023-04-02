const path = require('path');
const webpack = require('webpack');
const LodashModuleReplacementPlugin = require('lodash-webpack-plugin');

const env = process.env.NODE_ENV;

module.exports = {
  mode: 'production',

  entry: './src/index.js',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bigdata-react-tendency-chart.min.js',
    library: 'bigdata-react-tendency-chart',
    libraryTarget: 'umd',
  },

  module: {
    rules: [
      {
        // Run Eslint before compile
        test: /\.(js|jsx)$/,
        include: path.resolve(__dirname, 'src'),
        exclude: /node_modules/,
        enforce: 'pre',
        loader: 'eslint-loader',
      },

      {
        test: /\.(js|jsx)$/,
        include: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, '/node_modules/d3-array'),
          path.resolve(__dirname, '/node_modules/d3-axis'),
          path.resolve(__dirname, '/node_modules/d3-brush'),
          path.resolve(__dirname, '/node_modules/d3-dispatch'),
          path.resolve(__dirname, '/node_modules/d3-ease'),
          path.resolve(__dirname, '/node_modules/d3-format'),
          path.resolve(__dirname, '/node_modules/d3-path'),
          path.resolve(__dirname, '/node_modules/d3-scale'),
          path.resolve(__dirname, '/node_modules/d3-selection'),
          path.resolve(__dirname, '/node_modules/d3-shape'),
          path.resolve(__dirname, '/node_modules/d3-transition'),
        ],
        use: {
          loader: 'babel-loader',
          query: {
            plugins: ['lodash'],
          },
        },
      },
    ],
  },

  // devtool: 'inline-source-map',
  resolve: {
    extensions: ['.js', '.jsx'],
  },

  externals: {
    react: {
      root: 'React',
      commonjs2: 'react',
      commonjs: 'react',
      amd: 'react',
    },
    'react-dom': {
      root: 'ReactDOM',
      commonjs2: 'react-dom',
      commonjs: 'react-dom',
      amd: 'react-dom',
    },
    'prop-types': {
      root: 'PropTypes',
      commonjs2: 'prop-types',
      commonjs: 'prop-types',
      amd: 'prop-types',
    },
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(env),
    }),

    new LodashModuleReplacementPlugin(),

    new webpack.SourceMapDevToolPlugin({
      filename: '[file].map',
      exclude: [/[\\/]node_modules[\\/]/],
    }),
  ],
};
