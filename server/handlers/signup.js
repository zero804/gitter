/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var signupService = require("../services/signup-service"),
    middleware = require("../web/middleware"),
    loginUtils = require('../web/login-utils'),
    winston = require('winston'),
    nconf = require('../utils/config');

module.exports = {

    isMobile: function(req) {
      var userAgent = req.headers['user-agent'] || '';
      var compactView = userAgent.indexOf("Mobile/") >= 0;
      return compactView;
    },

    install: function(app) {
      var self = this;
      app.get(nconf.get('web:homeurl'),
        middleware.grantAccessForRememberMeTokenMiddleware,
        function(req, res, next) {

          if(req.user) {

            loginUtils.redirectUserToDefaultTroupe(req, res, next, {

              onNoValidTroupes: function() {

                // try go to the user's home page
                if (req.user.hasUsername()) {
                  res.relativeRedirect(req.user.username);
                }
                // get the user to choose a username on the signup page
                else {
                  res.render('signup', { compactView: self.isMobile(req), profileHasNoUsername: JSON.stringify(true), userId: JSON.stringify(req.user.id) });
                }

              }
            });

            return;
          }

          // when the viewer is not logged in:
          res.render('signup', { compactView: self.isMobile(req), profileHasNoUsername: JSON.stringify(false), userId: JSON.stringify(null) });
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

          email = email ? email.trim() : '';

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
              res.render('signup', { profileHasNoUsername: !user.username, userId: JSON.stringify(req.user.id) });
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
            signupService.confirmSignup(req.user, function(err, user, troupe) {
              if (err || !troupe) {
                res.relativeRedirect("/" + req.params.appUri);
                return;
              }

              res.relativeRedirect(troupe.getUrl(user.id));
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
