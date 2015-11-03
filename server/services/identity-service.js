'use strict';

var Q = require('q');
var persistence = require("./persistence-service");

var identityService = {
  getForUserAndProvider: function(user, provider) {
    return persistence.Identity.findOne({userId: user._id, provider: provider})
      .exec();
  }
};

module.exports = identityService;
