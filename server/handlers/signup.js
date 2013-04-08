/*jshint globalstrict:true, trailing:false, unused:true, node:true */
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
              // send back the troupe
              if(req.accepts('application/json')) {
                res.send({ success: true, troupeName: troupeName, email: email /*, redirectTo:  in this case we don't return a troupe URI because the user is not yet confirmed (this is poor consistency) */ });
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

      // this confirmation handler doesn't redirect to any specific troupe, use /troupeUri/confirm/abc for that instead
      app.get('/confirm/:confirmationCode',
        middleware.authenticate('confirm', { failureRedirect: '/confirm-failed' } ),
        function(req, res){
          winston.debug("Confirmation authenticated");

          signupService.confirm(req.user, function(err/*, user, troupe */) {
            if (err) {
              winston.error("Signup service confirmation failed", { exception: err } );

              middleware.logoutPreserveSession(req, res, function() {
                res.redirect(nconf.get('web:homeurl') + "#message-confirmation-failed-already-registered");
                //res.redirect("confirmation-failed");
              });

              return;

            }

            res.relativeRedirect(nconf.get('web:homeurl'));
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

      if (nconf.get('web:baseserver') === 'localhost') {
        app.post('/confirmationCodeForEmail', function(req, res/*, next */) {
          var forEmail = req.body.email;

          userService.findByEmail(forEmail, function(e, user) {
            if (e || !user) return res.send(404, "No user with that email signed up.");

            res.json({ confirmationCode: user.confirmationCode });
          });
        });
      }
    }
};
