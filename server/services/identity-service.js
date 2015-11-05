'use strict';

var Q = require('q');
var persistence = require("./persistence-service");

var identityService = {
  findForUser: function(user) {
    return persistence.Identity.find({userId: user._id})
      .exec();
  },
  getForUserAndProvider: function(user, provider) {
    return persistence.Identity.findOne({userId: user._id, provider: provider})
      .exec();
  }
};

module.exports = identityService;
