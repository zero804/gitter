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

          signupService.newUnauthenticatedAccessRequest(req.body.troupeUri, req.body.email, req.body.name, function(err) {
            if (err) {
              var e = { success: false };

              if (err.userExists) {
                e.userExists = true;
              }

              res.send(e, 400);
              return;
            }

            res.send({ success: true });
          });
        }
      );

      app.post(
        '/requestAccessExistingUser',
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
          var fromUserId = req.user.id;

          uriService.findUri(uri)
              .then(function(result) {
                if(!result) { winston.error("No troupe with uri: " + uri); return next(404); }

                var toTroupe = result.troupe;
                var toUser = result.user;

                if(toUser) {
                  // Invite the user to connect
                  return troupeService.inviteUserByUserId(null, fromUserId, toUser.id);
                }

                if(toTroupe) {
                  // Request access to a troupe
                  return troupeService.addRequest(toTroupe.id, fromUserId);
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