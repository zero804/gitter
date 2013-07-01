/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService = require('./troupe-service');
var persistence = require("./persistence-service");
var Q = require('q');

function createRegExpsForQuery(queryText) {
  var normalized = ("" + queryText).trim().toLowerCase();
  var parts = normalized.split(/[\s\'']+/)
                        .filter(function(s) { return !!s; })
                        .filter(function(s, index) { return index < 10; } );

  return Q.resolve(parts.map(function(i) {
    return new RegExp("\\b" + i, "i");
  }));
}

function searchForRegularExpressionsWithinUserIds(userIds, res, options) {
  var limit = options.limit || 20;
  var skip = options.skip || 0;

  if(limit > 100) {
    limit = 100;
  }

  var q = persistence.User.where('_id')['in'](userIds);

  res.forEach(function(r) {
    q.find({ displayName: r });
  });

  return q.limit(limit)
    .skip(skip)
    .select('displayName avatarVersion gravatarImageUrl')
    .execQ()
    .then(function(results) {
      return {
        hasMoreResults: undefined,
        limit: limit,
        skip: skip,
        results: results
      };
    });
}

function difference(ids, excludeIds) {
  if(!excludeIds || !excludeIds.length) return ids;
  var o = {};
  excludeIds.forEach(function(i) {
    o[i] = true;
  });
  return ids.filter(function(i) { return !o[i]; });
}

exports.searchForUsers = function(userId, queryText, options, callback) {
  return createRegExpsForQuery(queryText)
    .then(function(res) {
      if(!res.length) return [];

      return troupeService.findAllTroupesIdsForUser(userId)
        .then(function(troupeIds) {
          // No point in including a troupe if it's to be excluded
          if(options.excludeTroupeId) {
            troupeIds = troupeIds.filter(function(t) { return t != options.excludeTroupeId; } );
          }

          if(!troupeIds.length) return [];

          return troupeService.findAllUserIdsForTroupes(troupeIds)
            .then(function(userIds) {

              // Remove the user doing the search
              userIds = userIds.filter(function(t) { return t != userId; } );

              if(!userIds.length) return [];

              if(!options.excludeTroupeId) {
                return searchForRegularExpressionsWithinUserIds(userIds, res, options);
              }

              return troupeService.findUserIdsForTroupe(options.excludeTroupeId)
                .then(function(excludedTroupeUserIds) {
                  // Remove the user doing the search
                  userIds = difference(userIds, excludedTroupeUserIds);
                  return searchForRegularExpressionsWithinUserIds(userIds, res, options);
                });
            });
        });
    })
    .nodeify(callback);


};

/**
 * Search for implicit connections with whom the user does not have an explicit one-to-one connection
 * @return callback of search results
 */
exports.searchUnconnectedUsers = function(userId, queryText, options, callback) {
  return createRegExpsForQuery(queryText)
    .then(function(regExps) {

      if(!regExps.length) return [];

      return troupeService.findAllUserIdsForUnconnectedImplicitContacts(userId)
        .then(function(userIds) {
          return searchForRegularExpressionsWithinUserIds(userIds, regExps, options);
        });

    })
    .nodeify(callback);

};

exports.testOnly = {
  createRegExpsForQuery: createRegExpsForQuery
};
