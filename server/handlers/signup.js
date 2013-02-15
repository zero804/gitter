/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var form = require("express-form"),
    filter = form.filter,
    validate = form.validate,
    signupService = require("../services/signup-service"),
    userService = require("../services/user-service"),
    middleware = require("../web/middleware"),
    troupeService = require("../services/troupe-service"),
    loginUtils = require('../web/login-utils'),
    winston = require('winston'),
    nconf = require('../utils/config');

module.exports = {
    install: function(app) {

      app.get(nconf.get('web:homeurl'),
        middleware.grantAccessForRememberMeTokenMiddleware,
        function(req, res, next) {
          // console.log ("Compact: " this.compactView);
          if(req.user) {
            loginUtils.redirectUserToDefaultTroupe(req, res, next, {
              onNoValidTroupes: function() {
                res.render('signup', { noValidTroupes: JSON.stringify(true), userId: JSON.stringify(req.user.id) });
              }
            });

            return;
          }
          res.render('signup', { noValidTroupes: JSON.stringify(false), userId: JSON.stringify(null) });
        }
      );


      app.post(
        '/signup',
        // TODO this will need to be enhanced to accept the invitation inputs that are now on the create dialog,
        // will need to use json for this instead of form encoded data. Consider doing this through a rest handler.

        // Form filter and validation middleware
        /*
        form(
          filter("troupeName").trim(),
          validate("troupeName").required(),
          filter("email").trim(),
          validate("email").isEmail(),
          filter("userId").trim()
        ),
        */

        function(req, res) {

          var email = req.body.email;
          var userId = req.body.userId;
          var troupeName = req.body.troupeName;
          var invites = req.body.invites;

          /*
          if (!req.form.isValid) {
            // TODO: Handle errors
            winston.info("User form has errors", { errors: req.form.errors });
            // TODO: make this nice
            return res.send(500);
          }
          */

          // we can either get an email address for a new user
          if (email) {
            signupService.newSignup({
              troupeName: troupeName,
              email: email,
              invites: invites
            }, function(err, id) {
              if(err) {
                winston.error("Error creating new troupe ", { exception: err });

                if(req.accepts('application/json')) {
                  res.send(500);
                } else {
                  res.relativeRedirect("/");
                }
                return;
              }

              req.session.newTroupeId = id;
              if(req.accepts('application/json')) {
                res.send({ success: true, troupeName: troupeName, email: email });
              } else {
                res.relativeRedirect("/confirm");
              }
            });
          }

          // or we can get a user id for an existing user, in which case we need to lookup his email address
          // there are probably better ways to do this, but i don't them. MB
          else if (userId) {
            winston.info("Signing up a user with an email: " + email);

            userService.findById(userId, function(err,user) {

              if(err) {
                winston.error("Error finding user ", { exception: err });
                res.send(500);
              } else {
                winston.info("Got a user, his email is: ", user);

                signupService.newSignup({
                  troupeName: troupeName,
                  email: user.email,
                  invites: invites
                }, function(err,id) {
                  if(err) {
                    winston.error("Error creating new troupe ", { exception: err });

                    if(req.accepts('application/json')) {
                      res.send(500);
                    } else {
                      res.relativeRedirect("/");
                    }
                    return;
                  }

                  troupeService.findById(id, function(err,troupe) {

                    if (err) {
                      winston.error("Error finding troupe ", { exception: err });
                      res.send(500);
                    } else {
                      res.send({ success: true, redirectTo: troupe.uri});
                    }
                  });
                });

              }
            });
          }

          else {
            winston.info("Neither a troupe email address or a userId were provided for /signup");
            res.send(400);
          }

        }
      );

      app.get('/confirm', function(req, res) {
        res.render('confirm', {
          newTroupeId: req.session.newTroupeId
        });
      });

      app.get('/confirm/:confirmationCode',
        middleware.authenticate('confirm', { failureRedirect: '/confirm-failed' } ),
        function(req, res, next){
          winston.debug("Confirmation authenticated");

          signupService.confirm(req.user, function(err, user, troupe) {
            if (err) {
              winston.error("Signup service confirmation failed", { exception: err } );
              return next(err);
            }

            winston.debug("Redirecting newly confirmed user to troupe ", { troupeUri: troupe.uri } );
            res.relativeRedirect('/' + troupe.uri);
          });
        }
      );

      app.post('/resendconfirmation',
        function(req, res, next) {
          signupService.resendConfirmation({
            email: req.body.email,
            troupeId: req.session.newTroupeId
          }, function(err) {
            /* TODO: better error xhandling */
            if(err) return next(err);

            if(req.accepts('application/json')) {
              res.send({ success: true });
            } else {
              res.relativeRedirect("/confirm");
            }

            /* TODO: a proper confirmation screen that the email has been resent */
          });

        }
      );
    }
};
