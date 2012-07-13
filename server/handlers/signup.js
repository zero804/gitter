/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var form = require("express-form"),
    filter = form.filter,
    validate = form.validate,
    signupService = require("../services/signup-service"),
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
          validate("troupeName").required().is(/^[a-zA-Z0-9 ]+$/),
          filter("email").trim(),
          validate("email").isEmail()
        ),

        function(req, res) {
          console.log("request", req.headers);
          if (!req.form.isValid) {
            // TODO: Handle errors
            console.log(req.form.errors);
            /* TODO: make this nice */
            return res.send(500);
          }

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
              res.send({ success: true });
            } else {
              res.relativeRedirect("/confirm");
            }
          });

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
          signupService.confirm(req.user, function(err, user) {
            if (err) return next(err);
            res.relativeRedirect('/profile');
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
