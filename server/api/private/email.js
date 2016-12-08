"use strict";

var emailAddressService = require('../../services/email-address-service');

module.exports = function(req, res, next) {
  var user = req.user;

  return emailAddressService(user)
    .then(function(emailAddress) {
      res.send({ email: emailAddress, name: user.displayName });
    })
    .catch(next);
};
