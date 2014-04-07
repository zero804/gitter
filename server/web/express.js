/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var express        = require('express');
var passport       = require('passport');
var nconf          = require('../utils/config');
var expressHbs     = require('express-hbs');
var winston        = require('../utils/winston');
var responseTime   = require('./response-time');
var csrf           = require('./csrf-middleware');

// Naughty naughty naught, install some extra methods on the express prototype
require('./http');

function configureLogging(app) {
  app.use(responseTime(winston, nconf.get('logging:minimalAccess')));
}

module.exports = {
  /**
   * Configure express for the full web application
   */
  installFull: function(app, server, sessionStore) {
    expressHbs.registerHelper('cdn', require('./hbs-helpers').cdn);
    expressHbs.registerHelper('bootScript', require('./hbs-helpers').bootScript);
    expressHbs.registerHelper('isMobile', require('./hbs-helpers').isMobile);
    expressHbs.registerHelper('generateEnv', require('./hbs-helpers').generateEnv);
    expressHbs.registerHelper('generateTroupeContext', require('./hbs-helpers').generateTroupeContext);
    expressHbs.registerAsyncHelper('prerenderView', require('./prerender-helper'));
    expressHbs.registerHelper('chatItemPrerender', require('./prerender-chat-helper'));

    app.locals({
      googleTrackingId: nconf.get("web:trackingId"),
      minified: nconf.get('web:minified')
    });

    app.engine('hbs', expressHbs.express3({
      partialsDir: __dirname + '/../../' + nconf.get('web:staticContent') +'/templates/partials',
      contentHelperName: 'content'
    }));

    app.set('view engine', 'hbs');
    app.set('views', __dirname + '/../../' + nconf.get('web:staticContent') +'/templates');
    app.set('trust proxy', true);

    if(nconf.get('express:viewCache')) {
      app.enable('view cache');
    }

    if(nconf.get("logging:access") && nconf.get("logging:logStaticAccess")) {
      configureLogging(app);
    }

    var staticFiles = __dirname + "/../../" + nconf.get('web:staticContent');
    app.use(express['static'](staticFiles, {
      maxAge: nconf.get('web:staticContentExpiryDays') * 86400 * 1000
    }));

    if(nconf.get("logging:access") && !nconf.get("logging:logStaticAccess")) {
      configureLogging(app);
    }

    app.use(express.cookieParser());
    app.use(express.urlencoded());
    app.use(express.json());
    app.use(express.methodOverride());
    app.use(require('./middlewares/ie6-post-caching'));

    // TODO remove this by 9/May/2014
    app.use(function(req, res, next) {
      Object.keys(req.cookies).forEach(function(key) {
        if(key.indexOf('optimizely') === 0) {
          res.clearCookie(key);
        }
      });

      next();
    });

    app.use(express.session({
      secret: nconf.get('web:sessionSecret'),
      key: nconf.get('web:cookiePrefix') + 'session',
      store: sessionStore,
      cookie: {
        path: '/',
        httpOnly: true,
        maxAge: 14400000,
        domain: nconf.get("web:cookieDomain"),
        secure: nconf.get("web:secureCookies")
      }
    }));
    function log(req, res, next) {
      console.log('LOG');
    }
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(app.router);

    app.use(log);

    app.use(require('./middlewares/express-error-handler'));
  },

  installApi: function(app) {
    app.set('trust proxy', true);

    if(nconf.get("logging:access")) {
      configureLogging(app);
    }

    app.use(express.urlencoded());
    app.use(express.json());
    app.use(express.methodOverride());

    app.use(require('./middlewares/ie6-post-caching'));

    app.use(passport.initialize());
    app.use(app.router);

    app.use(require('./middlewares/api-error-handler'));
  },

  installSocket: function(app) {
    app.set('trust proxy', true);

    if(nconf.get("logging:access")) {
      app.use(responseTime(winston, nconf.get('logging:minimalAccess')));
    }

    app.use(express.cookieParser());
    app.use(express.urlencoded());
    app.use(express.json());

    app.use(require('./middlewares/api-error-handler'));
  }
};
