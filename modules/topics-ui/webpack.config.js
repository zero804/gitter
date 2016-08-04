"use strict";

var path = require('path');
var ExtractTextPlugin = require("extract-text-webpack-plugin");

var config = {
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
    loaders: [
      {
        test: /.less$/,
        loader: ExtractTextPlugin.extract('style-loader', 'css-loader!less-loader'),
        include: path.resolve(__dirname, './browser/less')
      },
      {
        test: /\.jsx$/,
        loader: 'babel',
        query: {
          presets: [
            "es2015",
            "react"
          ]
        }
      }
    ]
  },
  plugins: [
    new ExtractTextPlugin("style.css", { allChunks: false })
  ]
};

module.exports = config;
