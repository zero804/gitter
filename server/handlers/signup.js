/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston                 = require('winston');
var signupService           = require("../services/signup-service");
var userConfirmationService = require('../services/user-confirmation-service');
var middleware              = require("../web/middleware");
var loginUtils              = require('../web/login-utils');
var nconf                   = require('../utils/config');
var isPhone                 = require('../web/is-phone');
var contextGenerator        = require('../web/context-generator');
var statsService            = require("../services/stats-service");
var userAgentStats          = require('../web/useragent-stats');



module.exports = {

    install: function(app) {
      app.get('/x', function(req, res, next) {
        winston.warn('/x is only meant for testing, do not use in production. Use web:homeurl instead.');
        var homeurl = nconf.get('web:homeurl');
        if(homeurl === '/x') {
          next();
        } else {
          res.relativeRedirect(homeurl);
        }
      });

      app.get(nconf.get('web:homeurl'),
        middleware.ensureValidBrowser,
        middleware.grantAccessForRememberMeTokenMiddleware,
        function(req, res, next) {

          if(req.user) {
            loginUtils.redirectUserToDefaultTroupe(req, res, next);
            return;
          }

          // when the viewer is not logged in:
          var template = isPhone(req.headers['user-agent']) ? 'mobile/homepage' : 'homepage';
          res.render(template, { profileHasNoUsername: JSON.stringify(false), userId: JSON.stringify(null) });
        }
      );

      /* This redirection is used by the iOS app */
      app.get(
        '/signup',
        middleware.logout(),
        function(req, res) {
          res.relativeRedirect(nconf.get('web:homeurl') + '#signup');
        });

      /*
      Accepts JSON { email, userId, troupeName, invites: [] }
      Returns { success: true, troupeName, email, redirectTo }
      */
      app.post(
        '/signup',

        function(req, res, next) {
          var email = req.body.email;

          email = email ? email.trim().toLowerCase() : '';

          if(!email) {
            return next('Email address is required');
          }

          var stats = userAgentStats(req.headers['user-agent']);

          signupService.newSignupFromLandingPage({
            email: email,
            stats: stats
          }, function(err, user) {
            if(err) {
              winston.error("Error creating new troupe ", { exception: err });
              return next(err);
            }

            res.send({
              success: true,
              email: email,
              userStatus: user.status,
              username: user.username
            });

          });

        }
      );

      app.get('/signup/:confirmationCode',
        middleware.authenticate('confirm', { failureRedirect: '/confirm-failed' } ),
        function(req, res, next){
          winston.verbose("Confirmation authenticated");

          userConfirmationService.confirmSignup(req.user, function(err, user) {
            if (err) {
              statsService.event('confirmation_error', { userId: user.id });

              winston.error("Signup service confirmation failed", { exception: err } );

              middleware.logoutPreserveSession(req, res, function() {
                res.redirect(nconf.get('web:homeurl') + "#message-confirmation-failed-already-registered");
              });

              return;
            }

            if (user.hasPassword()) {
              // user has completed signup
              res.relativeRedirect('/' + user.username);
              return;
            }

            return signupService.shouldUserPerformStartProcess(user)
              .then(function(doStartProcess) {
                if(doStartProcess) {
                  res.relativeRedirect('/start');
                  return;
                }

                contextGenerator.generateMiniContext(req, function(err, troupeContext) {
                  res.render('complete-profile', { troupeContext: troupeContext });
                });
              })
              .fail(next);

          });
        });
    }
};
