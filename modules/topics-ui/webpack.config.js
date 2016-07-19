"use strict";

var path = require('path');

var config = {
  entry: {
    forums: path.resolve(__dirname, './browser/forums'),
  },
  output: {
    path: path.resolve(__dirname, './output'),
    libraryTarget: 'commonjs2',
    filename: '[name].js'
  },
  module: {
    loaders: [
      {
        test: /\.jsx$/,
        loader: 'babel',
        exclude: /\/node_modules\//,
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
