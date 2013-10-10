/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var winston          = require('winston');
var signupService    = require("../services/signup-service");
var userService      = require("../services/user-service");
var middleware       = require("../web/middleware");
var loginUtils       = require('../web/login-utils');
var nconf            = require('../utils/config');
var isPhone          = require('../web/is-phone');
var contextGenerator = require('../web/context-generator');
var statsService     = require("../services/stats-service");

module.exports = {

    install: function(app) {
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

          signupService.newSignupFromLandingPage({
            email: email
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

      app.get('/confirm',
        middleware.ensureLoggedIn(),
        function(req, res){
          winston.verbose("Confirmation authenticated");
          contextGenerator.generateMiniContext(req, function(err, troupeContext) {
            res.render('complete-profile', { troupeContext: troupeContext });
          });
        });


      app.get('/confirm/:confirmationCode',
        middleware.authenticate('confirm', { failureRedirect: '/confirm-failed' } ),
        function(req, res){
          winston.verbose("Confirmation authenticated");

          signupService.confirm(req.user, function(err, user) {
            if (err) {
              statsService.event('confirmation_error', { userId: user.id });

              winston.error("Signup service confirmation failed", { exception: err } );

              middleware.logoutPreserveSession(req, res, function() {
                res.redirect(nconf.get('web:homeurl') + "#message-confirmation-failed-already-registered");
              });

              return;
            }

            if (user.hasPassword()) {
              res.relativeRedirect('/' + user.username);
            } else {
              contextGenerator.generateMiniContext(req, function(err, troupeContext) {
                res.render('complete-profile', { troupeContext: troupeContext });
              });
            }
          });
        });

      app.get('/confirmSecondary/:confirmationCode',
        middleware.ensureLoggedIn(),
        function(req, res){
          winston.verbose("Confirmation authenticated");

          userService.confirmSecondaryEmailByCode(req.user, req.params.confirmationCode)
            .then(function(user) {
              statsService.event('confirmation_secondary_success', { userId: user.id });

              if (user.hasPassword()) {
                res.relativeRedirect('/' + user.username);
              } else {
                contextGenerator.generateMiniContext(req, function(err, troupeContext) {
                  res.render('complete-profile', { troupeContext: troupeContext });
                });
              }
            })
          .fail(function(err) {
            winston.error("user service confirmation failed", { exception: err } );

            statsService.event('confirmation_secondary_fail');

            res.relativeRedirect('/last');
          });
        });

      // This can probably go
      // TODO: remove
      app.get('/:appUri/confirm/:confirmationCode',
        middleware.authenticate('confirm', {}),
        function(req, res/*, next*/) {
          winston.verbose("Confirmation authenticated");

          /* User has been set passport/accept */
          signupService.confirmSignup(req.user)
            .fail(function(err) {
              winston.info('[signup] confirmation failed: ' + err, { exception: err });
            })
            .fin(function() {
              res.relativeRedirect("/" + req.params.appUri);
            });

      });

      app.post('/resendconfirmation',
        function(req, res) {
          signupService.resendConfirmation({
            email: req.body.email
          }, function(err) {
            if(err) {
              winston.error("Nothing to resend", { exception: err });
              res.send(404);
            } else {
              res.send({ success: true });
            }
          });

        }
      );
    }
};
