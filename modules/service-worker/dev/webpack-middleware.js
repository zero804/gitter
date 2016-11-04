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
    publicPath: "/_s/l/service-worker",
    stats: {
      colors: true
    }
  });

  // This change also needs to be implemented in nginx
  app.get('/_s/l/service-worker/sw.js', function(req, res, next) {
    res.set('Service-Worker-Allowed', '/')
    next();
  });

  app.use(middleware);
}

module.exports = {
  install: install
};
