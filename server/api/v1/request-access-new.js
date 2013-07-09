/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var signupService = require("../../services/signup-service"),
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

  signupService.signupWithAccessRequestToUri(uri, req.body.email, req.body.name)
    .then(function() {
      res.send({ success: true });
    }).fail(function(err) {
      winston.error("Request access failed: ", { exception: err });
      res.send({ success: false, userExists: err.userExists, hasPassword: err.hasPassword, memberExists: err.memberExists }, 400);
    });

};
