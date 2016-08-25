'use strict';

var Promise = require('bluebird');
var lazy = require('lazy.js');
var Group = require('gitter-web-persistence').Group;
var KnownExternalAccess = require('gitter-web-persistence').KnownExternalAccess;
var _ = require('lodash');
var assert = require('assert');
var debug = require('debug')('gitter:app:permissions:admin-filter');

function createHashFor(userIds) {
  return _.reduce(userIds, function(memo, userId) {
    memo[userId] = true;
    return memo;
  }, {});
}

function getQueryForGhRepo(securityDescriptor) {
  if (securityDescriptor.admins === 'GH_REPO_PUSH') {
    return {
      type: 'GH_REPO',
      policyName: securityDescriptor.admins,
      linkPath: securityDescriptor.linkPath,
      externalId: securityDescriptor.externalId
    };
  }
}

function getQueryForGhOrg(securityDescriptor) {
  if (securityDescriptor.admins === 'GH_ORG_MEMBER') {
    return {
      type: 'GH_ORG',
      policyName: securityDescriptor.admins,
      linkPath: securityDescriptor.linkPath,
      externalId: securityDescriptor.externalId
    };
  }
}

function getQueryForDescriptor(securityDescriptor) {
  switch(securityDescriptor.type) {
    case 'GH_REPO':
      return getQueryForGhRepo(securityDescriptor)

    case 'GH_ORG':
      return getQueryForGhOrg(securityDescriptor);

    default:
      return null;
  }
}

function findUsersForQuery(sdQuery, userIds) {
  var disjunction = [];

  var query = {
    type: sdQuery.type,
    policyName: sdQuery.policyName,
    $or: disjunction,
    userId: { $in: userIds }
  };

  if (sdQuery.externalId) {
    disjunction.push({
      externalId: sdQuery.externalId
    });
  }

  if (sdQuery.linkPath) {
    disjunction.push({
      linkPath: sdQuery.linkPath
    });
  }

  // Without this, a user could be an administrator of everything...
  assert(disjunction.length > 0);

  return KnownExternalAccess.distinct('userId', query)
    .read('secondaryPreferred')
    .exec();
}

var adminFilterInternal = Promise.method(function(securityDescriptor, userIds, nested) {
  // First step: check extraAdmins
  var usersInExtraAdmins, usersNotInExtraAdmins;

  if (securityDescriptor.extraAdmins && securityDescriptor.extraAdmins.length) {
    var extraAdminsHash = createHashFor(securityDescriptor.extraAdmins);

    usersInExtraAdmins = userIds.filter(function(userId) {
      return extraAdminsHash[userId];
    });

    usersNotInExtraAdmins = userIds.filter(function(userId) {
      return !extraAdminsHash[userId];
    });
  } else {
    usersInExtraAdmins = lazy([]);
    usersNotInExtraAdmins = userIds;
  }

  if (usersNotInExtraAdmins.isEmpty()) {
    debug('All users matched in extraAdmins')
    return usersInExtraAdmins;
  }

  if (securityDescriptor.type === 'GROUP') {
    // Deal with GROUP permissions by fetching the group securityDescriptor and
    // recursively calling this method on that group
    if (nested || !securityDescriptor.internalId) {
      return usersInExtraAdmins;
    } else {
      return Group.findById(securityDescriptor.internalId)
        .read('secondaryPreferred')
        .lean()
        .exec()
        .then(function(group) {
          if (!group) {
            return usersNotInExtraAdmins;
          }

          return adminFilterInternal(group, usersNotInExtraAdmins, true);
        })
        .then(function(userIds) {
          return usersInExtraAdmins.concat(userIds);
        });
    }
  } else {
    // Not a group, deal with GH_ORG, GH_REPO and null here
    var query = getQueryForDescriptor(securityDescriptor);

    if (query) {
      debug('Searching for users matching %j', query);

      return findUsersForQuery(query, usersNotInExtraAdmins.toArray())
        .then(function(adminUserIds) {
          if (!adminUserIds || !adminUserIds.length) {
            return usersInExtraAdmins;
          }

          return usersInExtraAdmins.concat(lazy(adminUserIds));
        });
    } else {
      return usersInExtraAdmins;
    }
  }
});

function adminFilter(objectWithSd, userIds) {
  if (!userIds.length) return [];
  if (!objectWithSd.sd) return [];

  return adminFilterInternal(objectWithSd.sd, lazy(userIds), false)
    .then(function(userIds) {
      return userIds.toArray();
    });
}

module.exports = Promise.method(adminFilter);
