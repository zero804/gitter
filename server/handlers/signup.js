/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var form = require("express-form"),
    filter = form.filter,
    validate = form.validate,
    signupService = require("../services/signup-service"),
    userService = require("../services/user-service"),
    troupeService = require("../services/troupe-service"),
    passport = require('passport');

module.exports = {
    install: function(app) {
      app.get(
        '/x',
        function(req, res) {
          if(req.user) {
            res.relativeRedirect("/select-troupe");
            return;
          }
          res.render('signup');
        }
      );


      app.post(
        '/signup',

        // Form filter and validation middleware
        form(
          filter("troupeName").trim(),
          validate("troupeName").required(),
          filter("email").trim(),
          validate("email").isEmail(),
          filter("userId").trim()
        ),

        function(req, res) {
          console.log("request", req.headers);
          if (!req.form.isValid) {
            // TODO: Handle errors
            console.log(req.form.errors);
            /* TODO: make this nice */
            return res.send(500);
          }

          // we can either get an email address for a new user
          if (req.form.email) {
            console.log("Got an Email address, must be a new user");
            signupService.newSignup({
              troupeName: req.form.troupeName,
              email: req.form.email
            }, function(err, id) {
              if(err) {
                if(req.accepts('application/json')) {
                  res.send(500);
                } else {
                  res.relativeRedirect("/");
                }
                return;
              }

              req.session.newTroupeId = id;
              if(req.accepts('application/json')) {
                res.send({ success: true, troupeName: req.form.troupeName, email: req.form.email });
              } else {
                res.relativeRedirect("/confirm");
              }
            });
          }

          // or we can get a user id for an existing user, in which case we need to lookup his email address
          // there are probably better ways to do this, but i don't them. MB
          if (req.form.userId) {
            console.log("Got a userID, must be an existing user who is clearly awesome");
            userService.findById(req.form.userId, function(err,user) {
              if(err) {
                res.send(500);
              } else {
                console.log("Got a user, his email is: " + JSON.stringify(user));

                signupService.newSignup({
                  troupeName: req.form.troupeName,
                  email: user.email
                }, function(err,id) {
                  if(err) {
                    if(req.accepts('application/json')) {
                      res.send(500);
                    } else {
                      res.relativeRedirect("/");
                    }
                    return;
                  }

                  troupeService.findById(id, function(err,troupe) {
                    if (err) {
                      res.send(500);
                    }
                    else {
                      console.log("Got a troupe, it is:" + JSON.stringify(troupe));
                      res.send({ success: true, redirectTo: troupe.uri});
                    }
                  });

                  // res.send(200);
                });

              }
            });
          }

        }
      );

      app.get('/confirm', function(req, res) {
        res.render('confirm', {
          newTroupeId: req.session.newTroupeId
        });
      });

      app.get('/confirm/:confirmationCode',
        passport.authenticate('confirm'),
        function(req, res, next){
          signupService.confirm(req.user, function(err, user, troupe) {
            if (err) return next(err);
            res.relativeRedirect('/' + troupe.uri);
          });
        }
      );

      app.post('/resendconfirmation',
        function(req, res) {
          signupService.resendConfirmation({
            troupeId: req.session.newTroupeId
          }, function(err, id) {
            /* TODO: better error handling */
            if(err) return res.send(500);

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
