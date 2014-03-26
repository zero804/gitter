/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var express        = require('express');
var passport       = require('passport');
var nconf          = require('../utils/config');
var expressHbs     = require('express-hbs');
var winston        = require('../utils/winston');
var middleware     = require('./middleware');
var fs             = require('fs');
var os             = require('os');
var responseTime   = require('./response-time');
var oauthService   = require('../services/oauth-service');
var csrf           = require('./csrf-middleware');
var statsService   = require('../services/stats-service');
var errorReporting = require('../utils/error-reporting');
var _              = require('underscore');

if(nconf.get('express:showStack')) {
  try {
    require("longjohn");
  } catch(e) {
    winston.info("Install longjohn using npm install longjohn if you would like better stacktraces.");
  }
}

// Naughty naughty naught, install some extra methods on the express prototype
require('./http');



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
    function configureLogging() {
      app.use(responseTime(winston, nconf.get('logging:minimalAccess')));
    }

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

    // registerAllTemplatesAsPartials(__dirname + '/../../' + nconf.get('web:staticContent') +'/js/views');

    app.set('view engine', 'hbs');
    app.set('views', __dirname + '/../../' + nconf.get('web:staticContent') +'/templates');
    app.set('trust proxy', true);

    if(nconf.get('express:viewCache')) {
      app.enable('view cache');
    }

    if(nconf.get("logging:access") && nconf.get("logging:logStaticAccess")) {
      configureLogging();
    }

    var staticFiles = __dirname + "/../../" + nconf.get('web:staticContent');
    app.use(express['static'](staticFiles, { maxAge: nconf.get('web:staticContentExpiryDays') * 86400 * 1000 } ));

    if(nconf.get("logging:access") && !nconf.get("logging:logStaticAccess")) {
      configureLogging();
    }

    app.use(express.cookieParser());
    // app.use(express.bodyParser());
    app.use(express.urlencoded());
    app.use(express.json());

    app.use(express.methodOverride());

    (function fileUploading() {
      var uploadDir = os.tmpDir() + "/troupe-" + os.hostname();

      // make sure it exists
      if (!fs.existsSync(uploadDir)) {
        winston.info("Creating the temporary file upload directory " + uploadDir);
        fs.mkdirSync(uploadDir);
      }

      // app.use(fineuploaderExpressMiddleware({ uploadDir: uploadDir }));

      // clean out the file upload directory every few hours
      setInterval(function() {
        winston.info("Cleaning up the file upload directory: " + uploadDir);

        var now = new Date();
        var expiration = nconf.get('express:fileCleanupExpiration') * 60 * 1000 || 60000;
        fs.readdir(uploadDir, function(e, fileNames) {
          fileNames.forEach(function(fileName) {
            fs.stat(uploadDir + '/' + fileName, function (e, stat) {
              if (e) return winston.error("Error stating file", e);
              if (now.getTime() - stat.mtime.getTime() > expiration) {
                winston.info("Deleting temp upload file " + fileName);
                fs.unlink(uploadDir + '/' + fileName);
              }
            });
          });
        });
      }, nconf.get('express:fileCleanupInterval') * 60 * 1000 || 60000);

    }());


    app.use(ios6PostCachingFix());
    app.use(express.session({
      secret: nconf.get('web:sessionSecret'),
      key: nconf.get('web:cookiePrefix') + 'session',
      store: sessionStore,
      cookie: {
        path: '/',
        httpOnly: true,
        maxAge: 14400000,
        domain: nconf.get("web:cookieDomain"),
        secure: false /*nconf.get("web:secureCookies") Express won't sent the cookie as the https offloading is happening in nginx. Need to have connection.proxySecure set*/
      }
    }));
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(csrf);
    app.use(app.router);



    function linkStack(stack) {
      if(!stack) return;
      return stack.split(/\n/).map(function(i) {
        return i.replace(/\(([^:]+):(\d+):(\d+)\)/, function(match, file, line, col) {
          var ourCode = file.indexOf('node_modules') == -1;
          var h = "(<a href='subl://open/?url=file://" + file + "&line=" + line + "&column=" + col + "'>" + file + ":" + line + ":" + col + "</a>)";
          if(ourCode) h = "<b>" + h + "</b>";
          return h;
        });
      }).join('\n');
    }

    app.use(function(err, req, res, next) {
      var user = req.user;
      var userId = user && user.id;

      if(err && err.gitterAction === 'logout_destroy_user_tokens') {
        if(user) {
          statsService.event('logout_destroy_user_tokens', { userId: userId });

          middleware.logout()(req, res, function() {
            if(err) winston.warn('Unable to log user out');

            user.githubToken = null;
            user.githubUserToken = null;
            user.githubScopes = null;

            user.save(function(err) {
              if(err) winston.error('Unable to save user: ' + err, { exception: err });

              oauthService.removeAllAccessTokensForUser(userId, function(err) {
                if(err) { winston.error('Unable to remove access tokens: ' + err, { exception: err }); }
                res.redirect('/');
              });
            });
          });
        } else {
          res.redirect('/');
        }

        return;
      }

      var status = 500;
      var template = '500';
      var message = "An unknown error occurred";
      var stack = err && err.stack;

      if(_.isNumber(err)) {
        if(err > 400) {
          status = err;
          message = 'HTTP ' + err;
        }
      } else {
        if(_.isNumber(err.status)) {
          status = err.status;
        }

        if(err.message) {
          message = err.message;
        }
      }

      if(status >= 500) {
        // Send to sentry
        errorReporting(err, { type: 'response', status: status, userId: userId, url: req.url, method: req.method });
        // Send to statsd
        statsService.event('client_error_5xx', { userId: userId });

        winston.error("An unexpected error occurred", {
          path: req.path,
          message: message
        });

        if(err.stack) {
          winston.error('Error: ' + err.stack);
        }

      } else if(status === 404) {
        statsService.event('client_error_404', { userId: userId });

        template = '404';
        stack = null;
      } else if(status >= 400 && status < 500) {
        statsService.event('client_error_4xx', { userId: userId });
      }
      res.status(status);

      var responseType = req.accepts(['html', 'json']);

      if (responseType === 'html') {
        res.render(template , {
          status: status,
          homeUrl : nconf.get('web:homeurl'),
          user: req.user,
          userMissingPrivateRepoScope: req.user && !req.user.hasGitHubScope('repo'),
          message: message,
          stack: nconf.get('express:showStack') && stack ? linkStack(stack) : null
        });
      } else if (responseType === 'json') {
        res.send({ error: message });
      } else {
        res.type('txt').send(message);
      }

    });

  },

  installSocket: function(app, server, sessionStore) {
    if(nconf.get("logging:access")) {
      app.use(express.logger());
    }

    app.use(express.cookieParser());
    // app.use(express.bodyParser());
    app.use(express.urlencoded());
    app.use(express.json());

    app.use(express.session({ secret: 'keyboard cat', store: sessionStore, cookie: { path: '/', httpOnly: true, maxAge: 14400000, domain: nconf.get("web:cookieDomain"), secure: nconf.get("web:secureCookies") }}));

    app.use(express.errorHandler({ showStack: nconf.get('express:showStack'), dumpExceptions: nconf.get('express:dumpExceptions') }));

  }
};
