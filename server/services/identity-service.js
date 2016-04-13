'use strict';

var Promise = require('bluebird');
var persistence = require("./persistence-service");
var mongooseUtils = require('../utils/mongoose-utils');

var identityService = {
  findForUser: function(user) {
    if (user._cachedIdentities) {
      return Promise.resolve(user._cachedIdentities);
    }

    return identityService.findByUserId(user.id)
      .then(function(identities) {
        user._cachedIdentities = identities;
        return identities;
      });
  },

  findByUserId: function(userId) {
    return persistence.Identity.find({userId: userId}).exec();
  },

  findByUserIds: function(userIds) {
    return mongooseUtils.findByFieldInValue(persistence.Identity, 'userId', userIds);
  },

  preloadForUsers: function(users) {
    // Take the existing cached identities into account and also cache the
    // newly loaded ones. Return them all.
    var cachedIdentities = [];
    var userMap = {};
    var userIds = users.reduce(function(ids, user) {
      userMap[user.id] = user;
      if (user._cachedIdentities) {
        cachedIdentities.push.apply(cachedIdentities, user._cachedIdentities);
      } else {
        user._cachedIdentities = [];
        ids.push(user.id);
      }
      return ids;
    }, []);

    // short circuit if the array is null
    if (!userIds.length) return cachedIdentities;

    return identityService.findByUserIds(userIds)
      .then(function(identities) {
        identities.forEach(function(identity) {
          userMap[identity.userId]._cachedIdentities.push(identity);
        });
        return cachedIdentities.concat(identities);
      });
  },

  listProvidersForUserId: function(userId) {
    return persistence.Identity.distinct('provider', { userId: userId }).exec();
  },

  listProvidersForUser: function(user) {
    return identityService.listPovidersForUserId(user.id);
  }
};

module.exports = identityService;
