/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var express = require('express'),
  passport = require('passport'),
  nconf = require('../utils/config'),
  handlebars = require('handlebars'),
  expressHbs = require('express-hbs'),
  winston = require('winston'),
  fineuploaderExpressMiddleware = require('fineuploader-express-middleware'),
  fs = require('fs'),
  os = require('os');

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
      var accessLogFile = nconf.get("logging:accessLogFile");
      var stream = accessLogFile ? fs.createWriteStream(accessLogFile, { flags: 'a' }) : null;

      var loggingOptions = {
        format: nconf.get("logging:loggingFormat"),
        stream: stream
      };

      app.use(express.logger(loggingOptions));
    }

    handlebars.registerHelper('cdn', require('./hbs-helpers').cdn);
    handlebars.registerHelper('bootScript', require('./hbs-helpers').bootScript);

    app.locals({
      trackingId: nconf.get("web:trackingId")
    });

    app.engine('hbs', expressHbs.express3({
      partialsDir: __dirname + '/../../' + nconf.get('web:staticContent') +'/templates/partials',
      handlebars: handlebars
    }));

    // registerAllTemplatesAsPartials(__dirname + '/../../' + nconf.get('web:staticContent') +'/js/views');

    app.set('view engine', 'hbs');
    app.set('views', __dirname + '/../../' + nconf.get('web:staticContent') +'/templates');
    app.set('trust proxy', true);

    if(nconf.get("logging:access") && nconf.get("logging:logStaticAccess")) {
      configureLogging();
    }

    var staticFiles = __dirname + "/../../" + nconf.get('web:staticContent');
    app.use(express['static'](staticFiles, { maxAge: nconf.get('web:staticContentExpiryDays') * 86400 * 1000 } ));

    if(nconf.get("logging:access") && !nconf.get("logging:logStaticAccess")) {
      configureLogging();
    }

    app.use(express.cookieParser());
    app.use(express.bodyParser());

    (function fileUploading() {
      var uploadDir = os.tmpDir() + "/troupe-" + os.hostname();

      // make sure it exists
      if (!fs.existsSync(uploadDir)) {
        winston.info("Creating the temporary file upload directory " + uploadDir);
        fs.mkdirSync(uploadDir);
      }

      app.use(fineuploaderExpressMiddleware({ uploadDir: uploadDir }));

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
      var meta = {
        path: req.path
      };
      if(err && err.message) {
        meta.err = err.message;
      }

      console.error(err);

      var status = err.status;

      winston.error("An unexpected error occurred", meta);
      if (status === 404) {
        res.status(404);
        res.render('404' , {
          homeUrl : nconf.get('web:homeurl')
        });
       } else {
        console.error(err.stack);
        res.status(500);
        res.render('500' , {
          homeUrl : nconf.get('web:homeurl'),
          stack: nconf.get('express:showStack') ? linkStack(err.stack) : null
        });
      }
      // expressErrorHandler(err, req, res, next);
    });

  },

  installSocket: function(app, server, sessionStore) {
    if(nconf.get("logging:access")) {
      app.use(express.logger());
    }

    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(express.session({ secret: 'keyboard cat', store: sessionStore, cookie: { path: '/', httpOnly: true, maxAge: 14400000, domain: nconf.get("web:cookieDomain"), secure: nconf.get("web:secureCookies") }}));

    app.use(express.errorHandler({ showStack: nconf.get('express:showStack'), dumpExceptions: nconf.get('express:dumpExceptions') }));

  }
};
