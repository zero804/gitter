'use strict';

var Promise = require('bluebird');
var KnownExternalAccess = require('gitter-web-persistence').KnownExternalAccess;
var Group = require('gitter-web-persistence').Group;

// Only search in last 100 used items
var MAX_ITEMS = 100;

function valueIfAllEqual(array, iterator) {
  if (!array.length) return null;

  var first = iterator(array[0]);
  if (!first) return null;

  if (array.length === 1) return first;
  for (var i = 1; i < array.length; i++) {
    if (iterator(array[i]) !== first) {
      return null;
    }
  }

  return first;
}

function findKnownAccessOfTypeForUser(type, userId) {
  var query = {
    userId: userId,
    type: type
  }

  return KnownExternalAccess.find(query, { _id: 0, type: 1, policyName: 1, linkPath: 1, externalId: 1 })
    .lean()
    .sort({ accessTime: -1 })
    .limit(MAX_ITEMS)
    .read('secondaryPreferred')
    .exec();
}

function createQueryFromKnownAccess(type, knownAccesses) {
  var allPolicyNamesEqual = valueIfAllEqual(knownAccesses, function(item) {
    return item.policyName;
  });

  var disjunction = knownAccesses
    .map(function(knownAccess) {
      var query;
      var linkPath = knownAccess.linkPath;
      var externalId = knownAccess.externalId;

      if (allPolicyNamesEqual) {
        query = {};
      } else {
        query = {
          'sd.admins': knownAccess.policyName
        }
      }

      if (linkPath && externalId) {
        query.$or = [{
          'sd.linkPath': linkPath
        }, {
          'sd.externalId': externalId
        }];

        return query;
      }

      if (linkPath) {
        query['sd.linkPath'] = linkPath;
        return query;
      }

      if (externalId) {
        query['sd.externalId'] = externalId;
        return query;
      }

      return null;
    })
    .filter(Boolean);

  // No good matches, return null
  if (!disjunction.length) return null;

  var query = {
    'sd.type': type,
    $or: disjunction
  };

  if (allPolicyNamesEqual) {
    query['sd.admins'] = allPolicyNamesEqual;
  }

  return query;
}

function findAdminGroupsOfTypeForUserId(type, userId) {
  if (!userId) return [];

  return findKnownAccessOfTypeForUser(type, userId)
    .then(function(knownAccesses) {
      if (!knownAccesses.length) return [];

      var query = createQueryFromKnownAccess(type, knownAccesses);
      if (!query) return [];

      return Group.find(query)
        .lean()
        .read('secondaryPreferred')
        .exec();
    })
}

module.exports = {
  findAdminGroupsOfTypeForUserId: Promise.method(findAdminGroupsOfTypeForUserId)
};
