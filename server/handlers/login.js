/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var loginUtils = require("../web/login-utils"),
    winston = require("winston"),
    nconf = require('../utils/config'),
    troupeService = require("../services/troupe-service"),
    middleware = require('../web/middleware'),
    userService = require('../services/user-service');

function handleJsonLogin(req, res) {
  var troupeUri = req.body.troupeUri;
  winston.info("login: Performing json login");

  function sendUri(uri) {
    res.send({
      failed: false,
      user: req.user,
      redirectTo: uri
    });
  }

  function sendTroupe(err,troupe) {
    if (err) return sendUri("/select-troupe");

    return sendUri(troupe.uri);
  }

  if(req.session.returnTo) {
    sendUri(req.session.returnTo);

    return;
  }

  if(troupeUri) {
    sendUri("/" + troupeUri);
    return;
  }

  if (req.user.lastTroupe) {
    troupeService.findById(req.user.lastTroupe, sendTroupe);
    return;
  }

  userService.findDefaultTroupeForUser(req.user.id, sendTroupe);
}

module.exports = {
    install: function(app) {
      app.post('/login',
        middleware.authenticate('local', { failureRedirect: '/login' }),
        middleware.generateRememberMeTokenMiddleware,
        function(req, res) {

          if(req.accepts(['html', 'json']) === 'json')
            return handleJsonLogin(req, res);

          if(req.session.returnTo) {
            winston.info("login: Returning user to original URL ", { url: req.session.returnTo });
            res.relativeRedirect(req.session.returnTo);
          } else {
            winston.info("login: Forwarding to select-troupe", { url: req.session.returnTo });

            res.relativeRedirect('/select-troupe');
          }

        });

      app.get('/login', function(req, res) {
        res.render('m.login.hbs', { });
      });

      app.post('/reset', function(req, res, next) {
        userService.requestPasswordReset(req.body.email, function(err, user) {
          if(err) return next(err);
          if(!user) {
            res.send({ failed: true });
            return;
          }

          res.send({ success: true });
        });
      });

      app.get('/reset/:confirmationCode',
        middleware.authenticate('passwordreset', { failureRedirect: nconf.get('web:homeurl') + '#passwordResetFailed=true' } ),
        function(req, res, next) {
          loginUtils.redirectUserToDefaultTroupe(req, res, next);
        });

      // Deprecated. Use the loginUtils.redirectUserToDefaultTroupe instead of
      // redirecting users here. Delete by 28 Feb 2013
      app.get('/select-troupe',
        middleware.ensureLoggedIn(),
        function(req, res, next) {
          loginUtils.redirectUserToDefaultTroupe(req, res, next);
        });

    }
};