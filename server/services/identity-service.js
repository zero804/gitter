'use strict';

var Q = require('q');
var persistence = require("./persistence-service");
var mongooseUtils = require('../utils/mongoose-utils');

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
  },

  findForUserIds: function(userIds) {
    return mongooseUtils.findByFieldInValue(persistence.Identity, 'userId', userIds);
  },

  findForUsers: function(users) {
    // Take the existing cached identities into account and also cache the
    // newly loaded ones. Return them all.
    var allIdentities = [];
    var userMap = {};
    var userIds = users.reduce(function(ids, user) {
      userMap[user.id] = user;
      if (user._cachedIdentities) {
        allIdentities.push.apply(allIdentities, user._cachedIdentities);
      } else {
        user._cachedIdentities = [];
        ids.push(user.id);
      }
      return ids;
    }, []);

    // short circuit if the array is null
    if (!userIds.length) return allIdentities;

    return identityService.findForUserIds(userIds)
      .then(function(identities) {
        for (var i=0; i<identities.length; i++) {
          var identity = identities[i];
          allIdentities.push(identity);
          userMap[identity.userId]._cachedIdentities.push(identity);
        }
        return allIdentities;
      });
  }
};

module.exports = identityService;
