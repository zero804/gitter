/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var userService = require("../services/user-service"),
    middleware = require('../web/middleware'),
    winston = require("winston"),
    expressValidator = require('express-validator');

module.exports = {
    install: function(app) {
      app.post(
          '/profile',
          middleware.grantAccessForRememberMeTokenMiddleware,
          middleware.ensureLoggedIn(),
          expressValidator({}),

          // Express request-handler now receives filtered and validated data
          function(req, res, next) {
            req.sanitize('displayName').trim();
            req.sanitize('displayName').xss();

            if(req.body.displayName) req.checkBody('displayName', 'Invalid name').notEmpty().is(/^[^<>]{2,}$/);
            if(req.body.newEmail) req.checkBody('newEmail', 'Invalid email address').notEmpty().isEmail();
            if(req.body.username) req.checkBody('username', 'Invalid username').notEmpty().is(/^[a-zA-Z0-9\.\-\_]{3,}$/);

            var mappedErrors = req.validationErrors(true);

            if (mappedErrors) {
              res.send({ success: false, validationFailure: true, errors: mappedErrors}, 400);
              return;
            }

            userService.updateProfile({
              userId: req.user.id,
              displayName: req.body.displayName,
              password: req.body.password,
              oldPassword: req.body.oldPassword,
              email: req.body.newEmail,
              username: req.body.username
            }, function(err) {
              if(err) {
                if(err.authFailure) {
                  res.send({ authFailure: true }, 400);
                  return;
                } else if (err.emailConflict) {
                  res.send({ success: false, emailConflict: true }, 400);
                  return;
                }

                winston.error("Unable to update profile", { exception: err });
                return next(err);
              }

              res.send({
                success: true,
                displayName: req.body.displayName
              });

            });
          }
        );

    }
};