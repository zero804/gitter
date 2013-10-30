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
          function(req, res) {
            req.sanitize('displayName').trim();
            req.sanitize('displayName').xss();

            if(req.body.hasOwnProperty('displayName')) req.checkBody('displayName', 'Invalid name').notEmpty().is(/^[^<>]{2,}$/);
            if(req.body.hasOwnProperty('username')) req.checkBody('username', 'Invalid username').notEmpty().is(/^[a-zA-Z0-9\.\-\_]{3,}$/);

            var mappedErrors = req.validationErrors(true);

            if (mappedErrors) {
              res.send(400, { validationFailure: true, errors: mappedErrors});
              return;
            }

            userService.updateProfile({
              userId: req.user.id,
              displayName: req.body.displayName,
              password: req.body.password,
              oldPassword: req.body.oldPassword,
              username: req.body.username
            }, function(err) {
              if(err) {
                if(err.authFailure) {
                  res.send(401, { authFailure: true });
                } else if(err.usernameConflict) {
                  res.send(409, { usernameConflict: true });
                } else{
                  winston.error("Unable to update profile", { exception: err });
                  res.send(500, err);
                }
              } else {
                res.send({
                  displayName: req.body.displayName
                });
              }
            });
          }
        );

    }
};