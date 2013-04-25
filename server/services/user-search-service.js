/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var troupeService = require('./troupe-service');
var persistence = require("./persistence-service");

function createRegExpsForQuery(queryText) {
  var normalized = ("" + queryText).toLowerCase().replace(/[^a-z\d\s]/g, ' ');
  var parts = normalized.split(/\s+/).filter(function(s, index) { return index < 10; } );
  return parts.map(function(i) {
    return new RegExp("\\b" + i, "i");
  });
}

function searchForRegularExpressionsWithinUserIds(userIds, res, options, callback) {
  var limit = options.limit || 20;
  var skip = options.skip || 0;

  if(limit > 100) {
    limit = 100;
  }

  var q = persistence.User.where('_id')['in'](userIds);

  res.forEach(function(r) {
    q.find({ displayName: r });
  });

  q.limit(limit)
    .skip(skip)
    .select('displayName avatarVersion gravatarImageUrl')
    .exec(function(err, results) {
      return callback(err, {
        hasMoreResults: undefined,
        limit: limit,
        skip: skip,
        results: results
      });
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
  var res = createRegExpsForQuery(queryText);
  if(!res.length) return callback(null, []);

  troupeService.findAllTroupesIdsForUser(userId, function(err, troupeIds) {
    if(err) return callback(err);

    // No point in including a troupe if it's to be excluded
    if(options.excludeTroupeId) {
      troupeIds = troupeIds.filter(function(t) { return t != options.excludeTroupeId; } );
    }

    if(!troupeIds.length) return callback(null, []);

    troupeService.findAllUserIdsForTroupes(troupeIds, function(err, userIds) {
      if(err) return callback(err);

      // Remove the user doing the search
      userIds = userIds.filter(function(t) { return t != userId; } );

      if(!userIds.length) return callback(err, []);

      if(!options.excludeTroupeId) {
        searchForRegularExpressionsWithinUserIds(userIds, res, options, callback);
        return;
      }

      troupeService.findUserIdsForTroupe(options.excludeTroupeId, function(err, excludedTroupeUserIds) {
        if(err) return callback(err);
        // Remove the user doing the search
        userIds = difference(userIds, excludedTroupeUserIds);
        searchForRegularExpressionsWithinUserIds(userIds, res, options, callback);
      });
    });
  });
};

exports.testOnly = {
  createRegExpsForQuery: createRegExpsForQuery
};
