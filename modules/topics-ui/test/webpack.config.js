"use strict";

var webpackConfig = require('../webpack.config.js');
var _ = require('lodash');
var path = require('path');

var config = _.extend({}, webpackConfig, {
  devtool: 'source-map',
  entry: {
    runner: path.resolve(__dirname, './fixtures/runner-browser.js')
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, './fixtures/build'),
  },
  resolve: {
    alias: {
      mocha: path.resolve(__dirname, '../node_modules/mocha/mocha.js'),
      mochaCss: path.resolve(__dirname, '../node_modules/mocha/mocha.css'),
      jquery: path.resolve(__dirname, '../node_modules/jquery/dist/jquery.js'),
      sinon: path.resolve(__dirname, '../node_modules/sinon/pkg/sinon.js'),
    }
  }
});

//Load in the mocha CSS so everything looks pretty
config.module.loaders.push({
  test:    /.css$/,
  loader:  'style-loader!css-loader',
});

module.exports = config;
