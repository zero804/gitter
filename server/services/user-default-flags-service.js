'use strict';

var _ = require('lodash');
var persistence = require("./persistence-service");
var mongooseUtils = require("../utils/mongoose-utils");
var StatusError = require('statuserror');
var roomMembershipFlags = require('./room-membership-flags');
var User = persistence.User;

var DEFAULT_USER_FLAGS = roomMembershipFlags.DEFAULT_USER_FLAGS;

/**
 * Returns the default flags for a user or
 * 404 StatusError if the user does not exist
 */
function getDefaultFlagsForUser(user) {
  return user.defaultFlags || DEFAULT_USER_FLAGS;
}

exports.getDefaultFlagsForUser = getDefaultFlagsForUser;
/**
 * Returns the default flags for a user or
 * 404 StatusError if the user does not exist
 */
function getDefaultFlagsForUserId(userId) {
  return User.findOne({
      _id: userId
    }, {
      _id: 0,
      defaultFlags: 1
    }, {
      lean: true
    })
    .exec()
    .then(function (user) {
      if (!user) throw new StatusError(404);

      if (!user.defaultFlags) return DEFAULT_USER_FLAGS;

      return user.defaultFlags;
    });
}

exports.getDefaultFlagsForUserId = getDefaultFlagsForUserId;

/**
 * Returns a hash default flags for some userIds
 */
function getDefaultFlagsForUserIds(userIds) {
  return mongooseUtils.findByIdsLean(User, userIds, {
      _id: 1,
      defaultFlags: 1
    })
    .then(function (users) {
      return _.transform(users, function (result, user) {
        result[user._id] = user.defaultFlags || DEFAULT_USER_FLAGS;
      }, {});
    });
}

exports.getDefaultFlagsForUserIds = getDefaultFlagsForUserIds;
