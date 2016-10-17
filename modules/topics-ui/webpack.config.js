"use strict";

var path = require('path');
var ExtractTextPlugin = require("extract-text-webpack-plugin");//eslint-disable-line node/no-unpublished-require
var getPostcssStack = require('gitter-styleguide/postcss-stack');//eslint-disable-line node/no-unpublished-require

var config = {
  devtool: 'eval',
  entry: {
    index: path.resolve(__dirname, './browser/js/index'),
  },
  output: {
    path: path.resolve(__dirname, "./output/assets/js/"),
    filename: "[name].js",
    chunkFilename: "[id].chunk.js",
    publicPath: "/_s/l/js/forums/",
    devtoolModuleFilenameTemplate: "[resource-path]",
    devtoolFallbackModuleFilenameTemplate: "[resource-path]?[hash]"
  },
  module: {
    noParse: [
      /\/sinon\.js/,
    ],
    preLoaders: [
      {
        test: /.css$/,
        loader: 'postcss-loader',
      },
    ],
    loaders: [
      {
        test: /.svg$/,
        loaders: ['svg-url-loader', 'svgo-loader']
      },
      {
        test: /.less$/,
        loader: ExtractTextPlugin.extract('style-loader', 'css-loader!less-loader'),
        include: path.resolve(__dirname, './browser/less'),
      },
      {
        test: /\.jsx?$/,
        loader: 'babel',
        exclude: [ /node_modules/ ],
        query: {
          presets: [
            // https://github.com/babel/babel-loader/issues/149
            require.resolve("babel-preset-es2015"),
            require.resolve("babel-preset-react")
          ]
        }
      }
    ]
  },
  resolve: {
    alias: {
      jquery: require.resolve('jquery'),
      backbone: require.resolve('backbone/backbone.js'),
      underscore: require.resolve('lodash')
    }
  },
  // Fix https://github.com/webpack/webpack/issues/1083#issuecomment-187627979
  // Also see https://github.com/babel/babel-loader/issues/149
  resolveLoader: {
    // ../../ so that it uses the node_modules parallel to the modules folder
    // rather than the one in modules/topics-ui. Otherwise you have to run npm
    // install in the topics-ui modules too.
    root: path.join(__dirname, '../../node_modules')
  },
  plugins: [
    new ExtractTextPlugin("style.css", { allChunks: false })
  ],
  externals: {
    'cheerio': 'window',
    'react/addons': true,
    'react/lib/ExecutionEnvironment': true,
    'react/lib/ReactContext': true,
    fs: '{}',
  },
  postcss: function(webpack) {
    return getPostcssStack(webpack);
  },
  bail: true
};

module.exports = config;
