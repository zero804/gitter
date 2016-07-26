"use strict";

var path = require('path');

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
  }
};

module.exports = config;
