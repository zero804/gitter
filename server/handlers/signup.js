/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var signupService = require("../services/signup-service");
var middleware = require("../web/middleware");
var loginUtils = require('../web/login-utils');
var winston = require('winston');
var nconf = require('../utils/config');
var isPhone = require('../web/is-phone');

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
          res.render('signup', { compactView: isPhone(req.headers['user-agent']) , profileHasNoUsername: JSON.stringify(false), userId: JSON.stringify(null) });
        }
      );


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

      app.get('/confirm/:confirmationCode',
        middleware.authenticate('confirm', { failureRedirect: '/confirm-failed' } ),
        function(req, res){
          winston.verbose("Confirmation authenticated");

          signupService.confirm(req.user, function(err, user) {
            if (err) {
              winston.error("Signup service confirmation failed", { exception: err } );

              middleware.logoutPreserveSession(req, res, function() {
                res.redirect(nconf.get('web:homeurl') + "#message-confirmation-failed-already-registered");
              });

              return;
            }

            if (user.hasUsername()) {
              res.relativeRedirect('/' + user.username);
            } else {
              res.render('signup', { compactView: isPhone(req.headers['user-agent']), profileHasNoUsername: !user.username, userId: JSON.stringify(req.user.id) });
            }
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
        function(req, res, next) {
          signupService.resendConfirmation({
            email: req.body.email,
            troupeId: req.session.newTroupeId
          }, function(err) {
            /* TODO: better error xhandling */
            if(err) return next(err);

            res.send({ success: true });
          });

        }
      );
    }
};
