'use strict';

var webpack = require('webpack');
var webpackMiddleware = require("webpack-dev-middleware");

var middleware = webpackMiddleware(webpack(require('../webpack.config')), {
  noInfo: false,
  quiet: true,
  lazy: false,
  watchOptions: {
    aggregateTimeout: 400
  },
  publicPath: "/_s/l/topics/js/",
  stats: {
    colors: true
  }
});

module.exports = middleware;
