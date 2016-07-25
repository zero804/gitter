"use strict";

var webpackConfig = require('../webpack.config.js');
var _ = require('lodash');
var glob = require('glob');
var path = require('path');

var config = _.extend({}, webpackConfig, {
  entry: glob.sync(path.resolve(__dirname) + '/**/*-test.js'),
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, './build'),
  }
});

config.module.loaders.push({
  test: /-test.js$/,
  loader: 'mocha-loader',
  query: {
    useColors: true
  },
});

module.exports = config;
