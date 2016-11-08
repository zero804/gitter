'use strict';

function create() {
  var webpack = require('webpack');
  var webpackMiddleware = require("webpack-dev-middleware");

  return webpackMiddleware(webpack(require('../webpack.config')), {
    noInfo: false,
    quiet: true,
    lazy: true,
    watchOptions: {
      aggregateTimeout: 400
    },
    publicPath: "/",
    stats: {
      colors: true
    }
  });
}

module.exports = {
  create: create
};
