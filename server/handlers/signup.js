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
        '/',
        function(req, res) {
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

        function(req, res){
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
              res.redirect("/");
              return;
            }

            req.session.newTroupeId = id;
            res.redirect("/confirm");
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
            res.redirect('/profile');
          });
        }
      );

      app.get('/resendconfirmation/:id',
        function(req, res) {
          signupService.resendConfirmation({
            troupeId: req.params.id
          }, function(err, id) {
            /* TODO: better error handling */
            if(err) return res.send(500);

            /* TODO: a proper confirmation screen that the email has been resent */
            req.session.newTroupeId = req.params.id;
            res.redirect("/confirm");
          });

        }
      );
    }
};
