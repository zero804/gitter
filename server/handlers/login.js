/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var passport = require("passport"),
    winston = require("winston"),
    nconf = require('../utils/config'),
    troupeService = require("../services/troupe-service"),
    rememberMe = require('../web/rememberme-middleware'),
    middleware = require('./middleware'),
    login = require('connect-ensure-login');
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
            console.log("Login was successful!: ", req.accepts(['json','html']));
            switch(req.accepts(['json','html'])) {
              case "json":
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
                break;

              case "html":
                if(req.session.returnTo) {
                  console.log("Returning to Previous URL");
                  res.relativeRedirect(req.session.returnTo);
                } else {
                  console.log("Going to Select Troupe");
                  res.relativeRedirect('/select-troupe');
                }
                break;
            }

          }

          if(req.body.rememberMe) {
            console.log("Remember me");
            rememberMe.generateAuthToken(req, res, req.user.id, {}, function(err) {
              if(err) winston.error(err);
              sendAffirmativeResponse();
            });
          } else {
            console.log("Don't remember me");
            sendAffirmativeResponse();
          }
        });

      app.get('/login', function(req, res) {
        res.render('m.login.hbs', {
        });
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
        login.ensureLoggedIn(),
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