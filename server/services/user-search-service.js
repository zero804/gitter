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

function executeSearch(q, options) {
  var limit = options.limit || 20;
  var skip = options.skip || 0;

  if(limit > 100) {
    limit = 100;
  }

  return q.limit(limit)
    .skip(skip)
    .select('displayName avatarVersion gravatarImageUrl username')
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


// TODO: Replace this with full-text search
function getSearchConjunction(res) {
  var displayNameSearch = { displayName: { $in: res } } ;
  var usernameSearch    = { username:    { $in: res } } ;

  return [displayNameSearch, usernameSearch];
}

function searchForRegularExpressionsWithinUserIds(userIds, res, fullSearchTerm, options) {
  var searchTerms = [ {
      $and: [
        { _id: { $in: userIds } },
        { $or: getSearchConjunction(res) }
      ]}
    ];

  if(fullSearchTerm.match(/^[\w\.]{3,}$/)) {
    searchTerms.push({ username: fullSearchTerm.toLowerCase() });
  }

  var q = persistence.User.find()
            .or(searchTerms);

  return executeSearch(q, options);
}


function searchForRegularExpressionsForAllUsers(res, options) {
  var q = persistence.User.find()
            .or(getSearchConjunction(res));

  return executeSearch(q, options);
}

function difference(ids, excludeIds) {
  if(!excludeIds || !excludeIds.length) return ids;
  var o = {};
  excludeIds.forEach(function(i) {
    o[i] = true;
  });
  return ids.filter(function(i) { return !o[i]; });
}

exports.globalUserSearch = function(queryText, options, callback) {
  return createRegExpsForQuery(queryText)
    .then(function(res) {
      if(!res.length) return [];
      return searchForRegularExpressionsForAllUsers(res, options);
    })
    .nodeify(callback);
};

exports.searchForUsers = function(userId, queryText, options, callback) {
  var emptyResponse = {
    hasMoreResults: undefined,
    limit: 20,
    skip: 0,
    results: []
  };

  return createRegExpsForQuery(queryText)
    .then(function(res) {
      if(!res.length) return emptyResponse;

      return troupeService.findAllTroupesIdsForUser(userId)
        .then(function(troupeIds) {
          // No point in including a troupe if it's to be excluded
          if(options.excludeTroupeId) {
            troupeIds = troupeIds.filter(function(t) { return t != options.excludeTroupeId; } );
          }

          if(!troupeIds.length) return emptyResponse;

          return troupeService.findAllUserIdsForTroupes(troupeIds)
            .then(function(userIds) {

              // Remove the user doing the search
              userIds = userIds.filter(function(t) { return t != userId; } );

              if(!userIds.length) return emptyResponse;

              if(!options.excludeTroupeId) {
                return searchForRegularExpressionsWithinUserIds(userIds, res, queryText, options);
              }

              return troupeService.findUserIdsForTroupe(options.excludeTroupeId)
                .then(function(excludedTroupeUserIds) {
                  // Remove the user doing the search
                  userIds = difference(userIds, excludedTroupeUserIds);
                  return searchForRegularExpressionsWithinUserIds(userIds, res, queryText, options);
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
          return searchForRegularExpressionsWithinUserIds(userIds, regExps, queryText, options);
        });

    })
    .nodeify(callback);

};

exports.testOnly = {
  createRegExpsForQuery: createRegExpsForQuery
};
