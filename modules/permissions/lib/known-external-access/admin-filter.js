'use strict';

var Promise = require('bluebird');
var lazy = require('lazy.js');
var Group = require('gitter-web-persistence').Group;
var KnownExternalAccess = require('gitter-web-persistence').KnownExternalAccess;
var _ = require('lodash');
var assert = require('assert');

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

  assert(disjunction.length > 0);

  return KnownExternalAccess.distinct('userId', query)
    .read('secondaryPreferred')
    .exec();
}

var adminFilterInternal = Promise.method(function(objectWithSd, userIds, nested) {
  // First step: check extraAdmins
  var usersInExtraAdmins, usersNotInExtraAdmins;

  if (objectWithSd.extraAdmins && objectWithSd.extraAdmins.length) {
    var extraAdminsHash = createHashFor(objectWithSd.extraAdmins);

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
    return usersInExtraAdmins;
  }

  if (objectWithSd.type === 'GROUP') {
    if (nested || !objectWithSd.internalId) {
      return usersInExtraAdmins;
    } else {
      return Group.findById(objectWithSd.internalId)
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
    var query = getQueryForDescriptor(objectWithSd.sd);
    if (query) {
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
})

function adminFilter(objectWithSd, userIds) {
  return adminFilterInternal(objectWithSd, lazy(userIds), false)
    .then(function(userIds) {
      return userIds.toArray();
    });
}

module.exports = Promise.method(adminFilter);
