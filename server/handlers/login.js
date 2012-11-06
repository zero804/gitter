/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var passport = require("passport"),
    winston = require("../utils/winston");
var nconf = require('../utils/config'),
    troupeService = require("../services/troupe-service"),
    rememberMe = require('../web/rememberme-middleware'),
    middleware = require('./middleware');
var userService = require('../services/user-service');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.relativeRedirect('/loginfail');
}

module.exports = {
    install: function(app) {
      var basepath = nconf.get("web:basepath");

      app.post('/login',
        passport.authenticate('local', { failureRedirect: basepath + '/login' }),
        function(req, res) {
          var troupeUri = req.body.troupeUri;
          winston.info("Login with requested troupe: ", troupeUri);
          function sendAffirmativeResponse() {
            if(req.accepts('application/json')) {
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
                }
                else {
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
              res.relativeRedirect('/select-troupe');
            }
          }

          if(req.body.rememberMe) {
            rememberMe.generateAuthToken(req, res, req.user.id, {}, function(err) {
              if(err) winston.error(err);
              sendAffirmativeResponse();
            });
          } else {
            sendAffirmativeResponse();
          }
        });

      app.get('/login', function(req, res) {
        if(req.accepts('application/json')) {
          res.send({ failed: true });
        } else {
          res.render('login', {
          });
        }
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
        passport.authenticate('passwordreset'),
        function(req, res, next) {
          res.relativeRedirect("/select-troupe");
        });

      app.get('/select-troupe', 
        middleware.ensureLoggedIn,
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