/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var signupService = require("../services/signup-service"),
    middleware = require("../web/middleware"),
    troupeService = require("../services/troupe-service"),
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

                res.render('signup', { compactView: self.isMobile(req), noValidTroupes: JSON.stringify(true), userId: JSON.stringify(req.user.id) });
              }
            });

            return;
          }
          res.render('signup', { compactView: self.isMobile(req), noValidTroupes: JSON.stringify(false), userId: JSON.stringify(null) });
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
          var troupeName = req.body.troupeName;

          troupeName = troupeName ? troupeName.trim() : '';
          email = email ? email.trim() : '';

          if(!troupeName) {
            return next('Troupe name is required');
          }

          if(!email) {
            return next('Email address is required');
          }

          signupService.newSignupFromLandingPage({
            troupeName: troupeName,
            email: email
          }, function(err, id) {
            if(err) {
              winston.error("Error creating new troupe ", { exception: err });
              return next(err);
            }

            req.session.newTroupeId = id;
            res.send({
              success: true,
              troupeName: troupeName,
              email: email
            });

          });

        }
      );

      // This endpoint is used only when the
      // user is attempting to change their email address
      app.get('/confirm/:confirmationCode',
        middleware.authenticate('confirm', { failureRedirect: '/confirm-failed' } ),
        function(req, res){
          winston.verbose("Email address confirmation authenticated");

          signupService.confirmEmailChange(req.user, function(err/*, user, troupe */) {
            if (err) {
              winston.error("Signup service confirmation failed", { exception: err } );

              middleware.logoutPreserveSession(req, res, function() {
                res.redirect(nconf.get('web:homeurl') + "#message-confirmation-failed-already-registered");
              });

              return;
            }

            res.relativeRedirect(nconf.get('web:homeurl'));
          });
        });


      app.get('/:troupeUri/confirm/:confirmationCode',
        middleware.authenticate('confirm', {}),
        function(req, res/*, next*/) {
            winston.verbose("Confirmation authenticated");

            /* User has been set passport/accept */
            signupService.confirmSignup(req.user, function(err, user, troupe) {
              if (err || !troupe) {
                res.relativeRedirect("/" + req.params.troupeUri);
                return;
              }

              res.relativeRedirect("/" + troupe.uri);
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
