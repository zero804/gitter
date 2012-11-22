/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var passport = require("passport"),
    winston = require("winston"),
    nconf = require('../utils/config'),
    troupeService = require("../services/troupe-service"),
    middleware = require('../web/middleware'),
    userService = require('../services/user-service');

module.exports = {
    install: function(app) {
      var basepath = nconf.get("web:basepath");

      app.post('/login',
        middleware.authenticate('local', { failureRedirect: '/login' }),
        middleware.rememberMe,
        function(req, res, next) {
          var troupeUri = req.body.troupeUri;
          winston.info("Login with requested troupe: ", { uri: troupeUri });

          if(req.accepts(['json','html']) === 'json') {
            if(troupeUri) {
              troupeService.findByUri(troupeUri, function(err, troupe) {
                if(err) return res.send(500);

                var a = {};

                if(troupe) {
                  a[troupeUri] = troupeService.userHasAccessToTroupe(req.user, troupe);
                } else {
                  // Troupe doesn't exist, just say the user doesn't have access
                  a[troupeUri] = false;
                }

                res.send({
                  failed: false,
                  user: req.user,
                  defaultTroupe: troupe,
                  hasAccessToTroupe: a
                });
              });
            } else {
              if (req.user.lastTroupe) {
                troupeService.findById(req.user.lastTroupe, function (err,troupe) {
                  if (err) troupe = null;
                  res.send({
                    failed: false,
                    user: req.user,
                    defaultTroupe: troupe
                  });
                });
              } else {
                userService.findDefaultTroupeForUser(req.user.id, function (err,troupe) {
                  if (err) troupe = null;
                  res.send({
                    failed: false,
                    user: req.user,
                    defaultTroupe: troupe
                  });
                });
              }
            }
          } else {
            if(req.session.returnTo) {
              res.relativeRedirect(req.session.returnTo);
            } else {
              res.relativeRedirect('/select-troupe');
            }
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