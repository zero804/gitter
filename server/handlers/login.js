/*jshint globalstrict:true, trailing:false unused:true node:true*/
/*global console:false, require: true, module: true */
"use strict";

var passport = require("passport"),
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
      var basepath = nconf.get("web:basepath");

      app.post('/login',
        middleware.authenticate('local', { failureRedirect: '/login' }),
        middleware.rememberMe,
        function(req, res, next) {

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
        middleware.authenticate('passwordreset', { failureRedirect: '/password-reset-failed' } ),
        function(req, res, next) {
          res.relativeRedirect("/select-troupe");
        });

      app.get('/select-troupe',
        middleware.ensureLoggedIn(),
        function(req, res) {
          if (req.user.lastTroupe) {
            troupeService.findById(req.user.lastTroupe, function (err,troupe) {
              if (err) troupe = null;
              res.redirect('/' + troupe.uri);
            });
          }

          else {
            userService.findDefaultTroupeForUser(req.user.id, function (err,troupe) {
              if (err) troupe = null;
              res.redirect('/' + troupe.uri);
            });
          }

        });

    }
};