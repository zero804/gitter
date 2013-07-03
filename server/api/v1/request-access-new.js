/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var signupService = require("../../services/signup-service"),
    userService = require("../../services/user-service"),
    uriService = require("../../services/uri-service"),
    winston = require('winston');

module.exports = function(req, res) {
  req.sanitize('name').trim();
  req.sanitize('name').xss();

  req.sanitize('email').trim();
  req.sanitize('email').xss();

  req.checkBody('name', 'Invalid name').notEmpty().is(/^[^<>]{2,}$/);
  req.checkBody('email', 'Invalid email address').notEmpty().isEmail();
  req.checkBody('appUri', 'Invalid appUri').notEmpty();


  var mappedErrors = req.validationErrors(true);

  if (mappedErrors) {
    res.send({ success: false, validationFailed: true, errors: mappedErrors}, 400);
    return;
  }

  // This is only for unauthenticated users
  if(req.user) {
    res.send({ success: false, message: "Cannot use this service if you are authenticated" }, 400);
    return;
  }


  var uri = req.body.appUri;

  userService.findByEmail(req.body.email)
    .then(function(fromUser) {
      // If we found the user, they already exist, so send them a message letting them know
      if(fromUser) throw { userExists: true };

      return uriService.findUri(uri)
        .then(function(result) {
          if(!result) { winston.error("No troupe with uri: " + uri); throw 404; }

          var toTroupe = result.troupe;
          var toUser = result.user;

          if(toUser) {
            return signupService.newSignupWithConnectionInvite(toUser, req.body.email, req.body.name);
          }

          if(toTroupe) {
            return signupService.newSignupWithAccessRequest({
                troupe: toTroupe,
                displayName: req.body.name,
                email: req.body.email
              });
          }

          throw new Error('Expected either a troupe or user attribute');
        });

    }).then(function() {
      res.send({ success: true });
    }).fail(function(err) {
      winston.error("Request access failed: ", { exception: err });
      res.send({ success: false, userExists: err.userExists, hasPassword: err.hasPassword, memberExists: err.memberExists }, 400);
    });

};
