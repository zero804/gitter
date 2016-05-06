'use strict';

var Promise = require('bluebird');
var Identity = require('gitter-web-persistence').Identity;
var mongooseUtils = require('gitter-web-persistence-utils/lib/mongoose-utils');
var userScopes = require('./user-scopes');


/*
NOTE: At present this is unreliable for finding all the identities for a user,
because it doesn't contain any GitHub identities. In order to know if a user is
a GitHub user you can sorta get away with just the username at present, but you
really need (pretty much) the full user object to be sure and to get any useful
info out. So be careful.
*/

function findForUser(user) {
  if (user._cachedIdentities) {
    return Promise.resolve(user._cachedIdentities);
  }

  return findByUserId(user.id)
    .then(function(identities) {
      user._cachedIdentities = identities;
      return identities;
    });
}

function findByUserId(userId) {
  return Identity.find({userId: userId}).exec();
}

function findByUserIds(userIds) {
  return mongooseUtils.findByFieldInValue(Identity, 'userId', userIds);
}

function preloadForUsers(users) {
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

  return findByUserIds(userIds)
    .then(function(identities) {
      identities.forEach(function(identity) {
        userMap[identity.userId]._cachedIdentities.push(identity);
      });

      return cachedIdentities.concat(identities);
    });
}

function listProvidersForUser(user) {
  // NOTE: right now you can only have one identity and this takes advantage
  // of that, but in future this will have to be updated so it doesn't return
  // early and instead appends them together.
  if (userScopes.isGitHubUser(user)) {
    return Promise.resolve(['github']);
  }
  return Identity.distinct('provider', { userId: user.id }).exec();
}

module.exports = {
  findForUser: findForUser,
  findByUserId: findByUserId,
  findByUserIds: findByUserIds,
  preloadForUsers: preloadForUsers,
  listProvidersForUser: listProvidersForUser
};
