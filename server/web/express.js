/*jslint node: true */
"use strict";

var express = require('express'),
  passport = require('passport'),
  nconf = require('../utils/config'),
  handlebars = require('handlebars'),
  expressHbs = require('express-hbs'),
  winston = require('winston'),
  http = require('./http'),
  fineuploaderExpressMiddleware = require('fineuploader-express-middleware'),
  cabinet = require('cabinet');

function ios6PostCachingFix() {
  return function(req, res, next) {
    if(req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE' || req.method === 'PATCH') {
      res.set('Cache-Control', 'no-cache');
    }
    next();
  };
}

module.exports = {
  installFull: function(app, server, sessionStore) {
    handlebars.registerHelper('cdn', require('./cdn-helper'));
    app.engine('hbs', expressHbs.express3({
      partialsDir: __dirname + '/../../' + nconf.get('web:staticContent') +'/templates/partials',
      handlebars: handlebars
    }));

    app.set('view engine', 'hbs');
    app.set('views', __dirname + '/../../' + nconf.get('web:staticContent') +'/templates');

    if(nconf.get("express:logging") && nconf.get("express:logStatic")) {
      app.use(express.logger(nconf.get("express:loggingConfig")));
    }

    //app.use(express['static'](__dirname + "/../../" + nconf.get('web:staticContent')));
    var staticFiles = __dirname + "/../../" + nconf.get('web:staticContent');

    var cabinetMiddleware = cabinet(staticFiles, {
      ignore: ['.git', 'node_modules'],
      hidden: false,
      coffee: false,
      expires: 0,
      gzip: true,
      less: {
        // Specify search paths for @import directives
        //paths: ['.',__dirname + '/static/stylesheets']
        paths: ['.',staticFiles + "/bootstrap/less"]
      },
        // Activates in-memory cache
      cache: {
        maxSize: 16384, // 16Kb pero object
        maxObjects:256
      }
    });
    app.use(cabinetMiddleware);

    if(nconf.get("express:logging") && !nconf.get("express:logStatic")) {
      app.use(express.logger(nconf.get("express:loggingConfig")));
    }

    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(fineuploaderExpressMiddleware());

    app.use(ios6PostCachingFix());
    app.use(express.session({ secret: 'keyboard cat', store: sessionStore, cookie: { path: '/', httpOnly: true, maxAge: 14400000, domain: nconf.get("web:cookieDomain"), secure: false /*nconf.get("web:secureCookies") Express won't sent the cookie as the https offloading is happening in nginx. Need to have connection.proxySecure set*/ }}));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(require('./rememberme-middleware').rememberMeMiddleware());
    app.use(app.router);

    var expressErrorHandler = express.errorHandler({ showStack: nconf.get('express:showStack'), dumpExceptions: nconf.get('express:dumpExceptions') });
    app.use(function(err, req, res, next) {
      winston.error("An unexpected error occurred", { error: err, path: req.path } );
      expressErrorHandler(err, req, res, next);
    });

  },

  installSocket: function(app, server, sessionStore) {
    if(nconf.get("express:logging")) {
      app.use(express.logger());
    }

    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(express.session({ secret: 'keyboard cat', store: sessionStore, cookie: { path: '/', httpOnly: true, maxAge: 14400000, domain: nconf.get("web:cookieDomain"), secure: nconf.get("web:secureCookies") }}));

    app.use(express.errorHandler({ showStack: nconf.get('express:showStack'), dumpExceptions: nconf.get('express:dumpExceptions') }));

  }
};
