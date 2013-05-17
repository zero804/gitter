/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var form = require("express-form"),
    filter = form.filter,
    validate = form.validate,
    signupService = require("../services/signup-service"),
    troupeService = require("../services/troupe-service"),
    passport = require('passport'),
    winston = require('winston');

module.exports = {
    install: function(app) {

      app.post(
        '/requestAccessNewUser',

        // Form filter and validation middleware
        form(
          filter("name").trim(),
          validate("troupeUri").required().is(/^[a-zA-Z0-9]+$/),
          validate("name").required().is(/^[^<>]+$/),
          filter("email").trim(),
          validate("email").isEmail()
        ),

        function(req, res) {
          if (!req.form.isValid) {
            winston.info("User form has errors", { errors: req.form.errors } );

            return res.send(400, { validationFailed: true, errors: req.form.errors });
          }

          signupService.newUnauthenticatedAccessRequest(req.form.troupeUri, req.form.email, req.form.name, function(err) {
            if (err) {
              var e = { success: false };

              if (err.userExists) {
                e.userExists = true;
              }

              res.send(e);
              return;
            }

            res.send({ success: true });
          });
        }
      );

      app.post(
        '/requestAccessExistingUser',

        // Form filter and validation middleware
        form(
          validate("troupeUri").required().is(/^[a-zA-Z0-9]+$/)
        ),

        function(req, res) {
          winston.info("Form", req.form);
          if (!req.form.isValid) {
            // TODO: Handle errors
            winston.info("User form has errors", req.form.errors);
            /* TODO: make this nice */
            return res.send(500);
          }

          troupeService.findByUri(req.form.troupeUri, function(err, troupe) {
            if(err) { winston.error("findByUri failed", err); return  res.send(500); }
            if(!troupe) { winston.error("No troupe with uri", req.form.troupeUri); return res.send(404); }


            troupeService.addRequest(troupe.id, req.user.id, function(err, request) {
              if(err) return res.send(500);
              res.send({ success: true });
            });

          });
        }
      );
    }
};