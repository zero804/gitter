/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var form = require("express-form"),
    filter = form.filter,
    validate = form.validate,
    signupService = require("../services/signup-service"),
    troupeService = require("../services/troupe-service"),
    passport = require('passport'),
    winston = require('../utils/winston');

module.exports = {
    install: function(app) {

      app.post(
        '/requestAccessNewUser',

        // Form filter and validation middleware
        form(
          filter("name").trim(),
          validate("troupeUri").required().is(/^[a-zA-Z0-9]+$/),
          validate("name").required().is(/^[a-zA-Z0-9 ]+$/),
          filter("email").trim(),
          validate("email").isEmail()
        ),

        function(req, res) {
          winston.info("Form", req.form);
          if (!req.form.isValid) {
            // TODO: Handle errors
            console.log(req.form.errors);
            /* TODO: make this nice */
            return res.send(500);
          }

          troupeService.findByUri(req.form.troupeUri, function(err, troupe) {
            if(err) { winston.error("findByUri failed", err); return  res.send(500); }
            if(!troupe) { winston.error("No troupe with uri", req.form.troupeUri); return res.send(404); }

            signupService.newSignupWithAccessRequest({
              troupeId: troupe.id,
              name: req.form.name,
              email: req.form.email
            }, function(err, userId) {
              if(err) { 
                winston.error("newSignupWithAccessRequest failed", err);

                if(err.userExists) {
                  return res.send({ success: false, userExists: true });
                }

                return res.send(500); 
              }

              res.send({ success: true });
            });

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
            console.log(req.form.errors);
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