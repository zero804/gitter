'use strict';

var Q = require('q');
var persistence = require("./persistence-service");

var identityService = {
  findForUser: function(user) {
    if (user._cachedIdentities) {
      return Q.resolve(user._cachedIdentities);
    }

    return persistence.Identity.find({userId: user._id})
      .exec()
      .then(function(identities) {
        user._cachedIdentities = identities;
        return identities;
      });
  }
};

module.exports = identityService;
