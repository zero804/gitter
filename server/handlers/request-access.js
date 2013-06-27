/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var middleware = require('../web/middleware');
var signupService = require("../services/signup-service"),
    troupeService = require("../services/troupe-service"),
    uriService = require("../services/uri-service"),
    winston = require('winston');
var expressValidator = require('express-validator');

module.exports = {
    install: function(app) {

      app.post(
        '/requestAccessNewUser',
        middleware.grantAccessForRememberMeTokenMiddleware,
        expressValidator({}),

        function(req, res) {
          req.sanitize('name').trim();
          req.sanitize('name').xss();

          req.sanitize('email').trim();
          req.sanitize('email').xss();

          req.checkBody('name', 'Invalid name').notEmpty().is(/^[^<>]{2,}$/);
          req.checkBody('email', 'Invalid email address').notEmpty().isEmail();
          req.checkBody('troupeUri', 'Invalid troupeUri').notEmpty();


          var mappedErrors = req.validationErrors(true);

          if (mappedErrors) {
            res.send({ success: false, validationFailed: true, errors: mappedErrors}, 400);
            return;
          }

          // This is only for unauthenticated users
          if(req.user) {
            res.send({ success: false, message: "Cannot use this service if you are authenticated" }, 400);
            return;
          }


          var uri = req.body.troupeUri;

          uriService.findUri(uri)
            .then(function(result) {
              if(!result) { winston.error("No troupe with uri: " + uri); throw 404; }

              var toTroupe = result.troupe;
              var toUser = result.user;

              if(toUser) {
                return signupService.newUnauthenticatedConnectionInvite(toUser, req.body.email, req.body.name);
              }

              if(toTroupe) {
                return signupService.newSignupWithAccessRequest({
                    troupe: toTroupe,
                    displayName: req.body.name,
                    email: req.body.email
                  });
              }

              throw new Error('Expected either a troupe or user attribute');
            }).then(function() {
              res.send({ success: true });
            }).fail(function(err) {
              winston.error("Request access failed: ", { exception: err });
              res.send({ success: false, userExists: err.userExists, hasPassword: err.hasPassword, memberExists: err.memberExists }, 400);
            });

        }
      );

      app.post(
        '/requestAccessExistingUser',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        expressValidator({}),

        function(req, res, next) {
          req.checkBody('troupeUri', 'Invalid troupeUri').notEmpty();

          var mappedErrors = req.validationErrors(true);

          if (mappedErrors) {
            res.send({ success: false, validationFailed: true, errors: mappedErrors}, 400);
            return;
          }

          var uri = req.body.troupeUri;

          uriService.findUri(uri)
              .then(function(result) {
                if(!result) { winston.error("No troupe with uri: " + uri); throw 404; }

                var toTroupe = result.troupe;
                var toUser = result.user;

                if(toUser) {
                  // Invite the user to connect
                  return troupeService.inviteUserByUserId(null, req.user, toUser.id);
                }

                if(toTroupe) {
                  // Request access to a troupe
                  return troupeService.addRequest(toTroupe, req.user.id);
                }

                throw new Error('Expected either a troupe or user attribute');
              })
              .then(function() {
                res.send({ success: true });
              })
              .fail(next);
        }
      );
    }
};