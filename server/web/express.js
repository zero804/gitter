/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env = require('../utils/env');
var config          = env.config;

var express        = require('express');
var passport       = require('passport');
var expressHbs     = require('express-hbs');
var rememberMe     = require('./middlewares/rememberme-middleware');
var cors           = require('cors');
var resolveStatic  = require('./resolve-static');

var devMode        = config.get('dev-mode');

// Naughty naughty naught, install some extra methods on the express prototype
require('./http');

module.exports = {
  /**
   * Configure express for the full web application
   */
  installFull: function(app, server, sessionStore) {
    require('./register-helpers')(expressHbs);

    app.locals({
      googleTrackingId: config.get("stats:ga:key"),
      googleTrackingDomain: config.get("stats:ga:domain"),
      liveReload: config.get('web:liveReload')
    });

    app.engine('hbs', expressHbs.express3({
      partialsDir: resolveStatic('/templates/partials'),
      onCompile: function(exhbs, source) {
         return exhbs.handlebars.compile(source, {preventIndent: true});
      },
      layoutsDir: resolveStatic('/layouts'),
      contentHelperName: 'content'
    }));

    app.disable('x-powered-by');
    app.set('view engine', 'hbs');
    app.set('views', resolveStatic('/templates'));
    app.set('trust proxy', true);

    if(config.get('express:viewCache')) {
      app.enable('view cache');
    }


    if(devMode) {
      var webpackMiddleware = require("webpack-dev-middleware");
      var webpack = require('webpack');

      process.env.WEBPACK_DEV_MODE = '1';

      app.use(webpackMiddleware(webpack(require('../../public/js/webpack.config')), {
          noInfo: false,
          quiet: false,
          lazy: false,
          watchDelay: 300,
          publicPath: "/_s/l/js/",
          stats: {
              colors: true
          }
      }));

      app.use('/_s/l/styles', express.static('output/assets/styles', {
        maxAge: 0
      }));

      app.use('/_s/l', express.static(resolveStatic(), {
        maxAge: 0
      }));
    }

    app.use(env.middlewares.accessLogger);

    app.use(express.cookieParser());
    app.use(express.urlencoded());
    app.use(express.json());
    app.use(express.methodOverride());
    app.use(require('./middlewares/ie6-post-caching'));
    app.use(require('./middlewares/i18n'));


    app.use(express.session({
      secret: config.get('web:sessionSecret'),
      key: config.get('web:cookiePrefix') + 'session',
      store: sessionStore,
      cookie: {
        path: '/',
        httpOnly: true,
        maxAge: 14400000,
        domain: config.get("web:cookieDomain"),
        secure: config.get("web:secureCookies")
      }
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    app.use(require('./middlewares/authenticate-bearer'));
    app.use(rememberMe.rememberMeMiddleware);
    app.use(require('./middlewares/rate-limiter'));
    app.use(require('./middlewares/record-client-usage-stats'));

    app.use(require('./middlewares/configure-csrf'));
    app.use(require('./middlewares/enforce-csrf'));

    app.use(require('./middlewares/tokenless-user'));

    app.use(app.router);

    app.use(require('./middlewares/token-error-handler'));
    app.use(require('./middlewares/express-error-handler'));
  },

  installApi: function(app) {
    app.disable('x-powered-by');
    app.set('trust proxy', true);

    app.use(env.middlewares.accessLogger);

    app.use(express.urlencoded());
    app.use(express.json());
    app.use(express.methodOverride());

    app.use(require('./middlewares/ie6-post-caching'));
    app.use(require('./middlewares/i18n'));

    app.use(passport.initialize());
    app.use(require('./middlewares/rate-limiter'));
    app.use(require('./middlewares/record-client-usage-stats'));


    // API uses CORS
    var corsOptions = {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      maxAge: 600, // 10 minutes
      allowedHeaders: [
        'content-type',
        'x-access-token',
        'accept'
      ],
      exposedHeaders: [
        // Rate limiting with dolph
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset'
      ]
    };

    app.use(cors(corsOptions));

    app.options('*', cors(corsOptions));

    app.use(app.router);

    app.use(require('./middlewares/token-error-handler'));
    app.use(env.middlewares.errorHandler);
  },

  installSocket: function(app) {
    app.disable('x-powered-by');
    app.set('trust proxy', true);
    app.use(env.middlewares.accessLogger);
    app.use(express.cookieParser());
    app.use(express.urlencoded());
    app.use(express.json());

    app.use(require('./middlewares/token-error-handler'));
    app.use(env.middlewares.errorHandler);
  }
};
