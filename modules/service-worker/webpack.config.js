"use strict";

var path = require('path');

var config = {
  entry: {
    sw: require.resolve('./service-worker/sw'),
  },
  output: {
    path: path.resolve(__dirname, "./output/assets/"),
    filename: "[name].js",
    chunkFilename: "[id].chunk.js",
    publicPath: "/",
    devtoolModuleFilenameTemplate: "[resource-path]",
    devtoolFallbackModuleFilenameTemplate: "[resource-path]?[hash]"
  },
  bail: true
};

module.exports = config;
