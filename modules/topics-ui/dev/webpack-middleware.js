'use strict';

var webpack = require('webpack');// eslint-disable-line node/no-unpublished-require
var webpackMiddleware = require("webpack-dev-middleware"); // eslint-disable-line node/no-unpublished-require

var middleware = webpackMiddleware(webpack(require('../webpack.config')), {
  noInfo: false,
  quiet: true,
  lazy: false,
  watchOptions: {
    aggregateTimeout: 400
  },
  publicPath: "/_s/l/js/forums/",
  stats: {
    colors: true
  }
});

module.exports = middleware;
