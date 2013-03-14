/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var form = require("express-form"),
    filter = form.filter,
    validate = form.validate,
    userService = require("../services/user-service"),
    middleware = require('../web/middleware'),
    winston = require("winston");

module.exports = {
    install: function(app) {
      app.get('/profile',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        function(req, res) {
          var displayName;
          if(req.form && "displayName" in req.form) {
            displayName = req.form.displayName;
          } else {
            displayName = req.user.displayName;
          }

          res.render('profile', {
            flash: req.flash,
            displayName: req.user.displayName,
            noPassword: !req.user.passwordHash
          });
      });

      app.post(
          '/profile',
          middleware.grantAccessForRememberMeTokenMiddleware,
          middleware.ensureLoggedIn(),
          // Form filter and validation middleware
          form(
            filter("displayName").trim(),
            validate("displayName").required().is(/^[\w\d\. \-\'\d]+$/),
            filter("password").trim(),
            filter("oldPassword").trim(),
            filter("newEmail").trim()
          ),

          // Express request-handler now receives filtered and validated data
          function(req, res, next) {
            if(!req.user) {
              return next("Not signed in");
            }

            if (!req.form.isValid) {
              if(req.accepts("application/json")) {
                winston.info("Form is not valid");
                 res.send(500);
              } else {
                res.render('profile', {
                  flash: req.flash,
                  errors: req.form.errors,
                  displayName: req.form.displayName
                });
              }

              return;
            }

            userService.updateProfile({
              userId: req.user.id,
              displayName: req.form.displayName,
              password: req.form.password,
              oldPassword: req.form.oldPassword,
              email: req.form.newEmail
            }, function(err) {
              if(err) {
                if(err.authFailure && req.accepts("application/json")) {
                  res.send({ authFailure: true });
                  return;
                }
                winston.error("Unable to update profile", { exception: err });
                return next(err);
              }

              if(req.accepts("application/json")) {
                res.send({
                  success: true,
                  displayName: req.form.displayName
                });
              } else {
                userService.findDefaultTroupeForUser(req.user.id, function(err, troupe) {
                  if(err) return next(err);
                  if(!troupe) return next("Unable to determine default troupe for user");

                  res.relativeRedirect("/" + troupe.uri);
                  return;
                });
              }

            });
          }
        );

    }
};