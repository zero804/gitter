/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var form = require("express-form"),
    filter = form.filter,
    validate = form.validate,
    signupService = require("../services/signup-service"),
    userService = require("../services/user-service"),
    passport = require('passport'),
    middleware = require('./middleware'),
    winston = require("winston");

module.exports = {
    install: function(app) {
      app.get('/profile',
        middleware.ensureLoggedIn,
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
          middleware.ensureLoggedIn,
          // Form filter and validation middleware
          form(
            filter("displayName").trim(),
            validate("displayName").required().is(/^[a-zA-Z\. \-\']+$/),
            filter("password").trim(),
            filter("oldPassword").trim()
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
              oldPassword: req.form.oldPassword
            }, function(err) {
              if(err) {
                if(err.authFailure && req.accepts("application/json")) {
                  res.send({ authFailure: true });
                  return;
                }
                winston.error("Unable to update profile", err);
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