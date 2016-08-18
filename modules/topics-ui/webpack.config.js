"use strict";

var path = require('path');
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var getPostcssStack = require('gitter-styleguide/postcss-stack');

var config = {
  devtool: 'source-map',
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
    preLoaders: [
      {
        test: /.css$/,
        loader: 'postcss-loader',
      },
    ],
    loaders: [
      {
        test: /.less$/,
        loader: ExtractTextPlugin.extract('style-loader', 'css-loader!less-loader'),
        include: path.resolve(__dirname, './browser/less'),
      },
      {
        test: /\.jsx?$/,
        loader: 'babel',
        exclude: /node_modules/,
        query: {
          presets: [
            "es2015",
            "react"
          ]
        }
      }
    ]
  },
  resolve: {
    alias: {
      jquery: require.resolve('jquery'),
      underscore: require.resolve('lodash')
    }
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
