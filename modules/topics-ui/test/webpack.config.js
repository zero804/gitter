"use strict";

var webpackConfig = require('../webpack.config.js');
var _ = require('lodash');
var path = require('path');

var moduleConfig = _.extend({}, (webpackConfig.module || {}), {
  loaders: (webpackConfig.module.loaders || []).concat([
    {
      // Fix via https://github.com/webpack/webpack/issues/177#issuecomment-151916287
      test: /sinon\.js$/,
      loader: "imports?define=>false,require=>false"
    }
  ])
});

var config = _.extend({}, webpackConfig, {
  devtool: 'source-map',
  entry: {
    runner: path.resolve(__dirname, './fixtures/runner-browser.js')
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, './fixtures/build'),
  },
  module: moduleConfig,
  resolve: {
    alias: {
      backbone: require.resolve('backbone/backbone.js'),
      mocha: require.resolve('mocha/mocha.js'),
      mochaCss: require.resolve('mocha/mocha.css'),
      jquery: require.resolve('jquery/dist/jquery.js'),
      sinon: require.resolve('sinon/pkg/sinon.js'),
      'gitter-realtime-client/lib/simple-filtered-collection': require.resolve('gitter-realtime-client/lib/simple-filtered-collection'),
      'gitter-realtime-client': path.resolve(__dirname, './mocks/realtime.js'),
    }
  }
});

//Load in the mocha CSS so everything looks pretty
config.module.loaders.push({
  test:    /.css$/,
  loader:  'style-loader!css-loader',
});

module.exports = config;
