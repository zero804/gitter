'use strict';

function install(app) {
  var webpack = require('webpack');
  var webpackMiddleware = require("webpack-dev-middleware");

  var middleware = webpackMiddleware(webpack(require('../webpack.config')), {
    noInfo: false,
    quiet: true,
    lazy: false,
    watchOptions: {
      aggregateTimeout: 400
    },
    publicPath: "/_s/l/web-push",
    stats: {
      colors: true
    }
  });
  app.get('/_s/l/web-push/sw.js', function(req, res, next) {
    res.set('Service-Worker-Allowed', '/')
    next();
  })
  app.use(middleware);
}

module.exports = {
  install: install
};
