"use strict";

var persistence = require('gitter-web-persistence');
var Promise = require('bluebird');
var client = require('../utils/elasticsearch-client');
var collections = require('../utils/collections');
var _ = require('underscore');
var userService = require('./user-service');
var roomMembershipService = require('./room-membership-service');

var LARGE_ROOM_SIZE_THRESHOLD = 200;

function createRegExpsForQuery(queryText) {
  var normalized = ("" + queryText).trim().toLowerCase();
  var parts = normalized.split(/[\s\'']+/)
                        .filter(function(s) { return !!s; })
                        .filter(function(s, index) { return index < 10; });

  return Promise.resolve(parts.map(function(i) {
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
    .select('displayName gravatarVersion gravatarImageUrl username')
    .exec()
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
  var usernameSearch = { username: { $in: res } } ;

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


function difference(ids, excludeIds) {
  if(!excludeIds || !excludeIds.length) return ids;
  var o = {};
  excludeIds.forEach(function(i) {
    o[i] = true;
  });
  return ids.filter(function(i) { return !o[i]; });
}

function performQuery(queryText, options) {
  var queryRequest = {
    size: options.limit || 10,
    timeout: 500,
    index: 'gitter-primary',
    type: 'user',
    body: {
      fields: ["_id"],
      query: {
        query_string: {
          query: queryText,
          default_operator: "AND"
        }
      },
      sort: [
        { _score: { order: "desc"} }
      ],
    }
  };

  return client.search(queryRequest).then(elasticResponseToUserIds);
}

function elasticsearchUserTypeahead(queryText, options) {

  // Normal searches dont work well for typeaheads
  // e.g searching "maldito" normally wouldnt match malditogeek.
  // but phrase_prefix handles that.
  //
  // Completion Suggester is faster, but requires us to completely
  // reindex and supply a room context

  options = options || {};
  var limit = options.limit || 10;
  var userIds = options.userIds;

  var query = {
    multi_match: {
      query: queryText,
      type: "phrase_prefix",
      fields: [
        "username",
        "displayName"
      ]
    }
  };

  if (userIds) {
    query = {
      filtered: {
        filter: { ids: { values: userIds } },
        query: query
      }
    };
  }

  var queryRequest = {
    size: limit,
    timeout: 500,
    index: 'gitter-primary',
    type: 'user',
    body: {
      fields: ["_id"],
      query: query,
      sort: [
        { _score: { order: "desc"} }
      ],
    }
  };

  return client.search(queryRequest).then(elasticResponseToUserIds);
}

function elasticResponseToUserIds(response) {
  return response.hits.hits.map(function(hit) {
    return hit._id;
  });
}

exports.globalUserSearch = function(queryText, options, callback) {
  options = _.defaults(options, { limit: 5 });
  return performQuery(queryText, options)
    .then(function(userIds) {
      if(!userIds || !userIds.length) return [];
      return userService.findByIds(userIds)
        .then(function(users) {
          return collections.maintainIdOrder(userIds, users);
        });
    })
    .then(function(results) {
      return {
        hasMoreResults: undefined,
        limit: options.limit,
        skip: 0,
        results: results
      };
    })
    .nodeify(callback);
};

function searchForUsersInSmallRoom(queryText, roomId, options) {
  options = options || {};
  var limit = options.limit || 30;

  return roomMembershipService.findMembersForRoom(roomId)
    .then(function(userIds) {
      if (!userIds || !userIds.length) return [];

      return elasticsearchUserTypeahead(queryText, { limit: limit, userIds: userIds });
    })
    .then(function(userIds) {
      return userService.findByIds(userIds)
        .then(function(users) {
          return collections.maintainIdOrder(userIds, users);
        });
    })
    .then(function(results) {
      return {
        hasMoreResults: undefined,
        limit: limit,
        skip: 0,
        results: results
      };
    });
}

function searchForUsersInLargeRoom(queryText, roomId, options) {
  options = options || {};
  var limit = options.limit || 30;

  // no guarentee that these users are in the room
  // so we get a decent chunk and then filter by membership
  return elasticsearchUserTypeahead(queryText, { limit: 500 })
    .then(function(userIds) {
      return roomMembershipService.findMembershipForUsersInRoom(roomId, userIds);
    })
    .then(function(userIds) {
      userIds = userIds.slice(0, limit);

      return userService.findByIds(userIds)
        .then(function(users) {
          return collections.maintainIdOrder(userIds, users);
        });
    })
    .then(function(results) {
      return {
        hasMoreResults: undefined,
        limit: limit,
        skip: 0,
        results: results
      };
    });
}

exports.searchForUsersInRoom = function(queryText, roomId, options) {
  return roomMembershipService.countMembersInRoom(roomId)
    .then(function(userCount) {
      if (userCount < LARGE_ROOM_SIZE_THRESHOLD) {
        return searchForUsersInSmallRoom(queryText, roomId, options);
      } else {
        return searchForUsersInLargeRoom(queryText, roomId, options);
      }
    });
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

      return roomMembershipService.findRoomIdsForUser(userId)
        .then(function(troupeIds) {
          // No point in including a troupe if it's to be excluded
          if(options.excludeTroupeId) {
            troupeIds = troupeIds.filter(function(t) { return t != options.excludeTroupeId; });
          }

          if(!troupeIds.length) return emptyResponse;

          return roomMembershipService.findAllMembersForRooms(troupeIds)
            .then(function(userIds) {

              // Remove the user doing the search
              userIds = userIds.filter(function(t) { return t != userId; });

              if(!userIds.length) return emptyResponse;

              if(!options.excludeTroupeId) {
                return searchForRegularExpressionsWithinUserIds(userIds, res, queryText, options);
              }

              return roomMembershipService.findMembersForRoom(options.excludeTroupeId)
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

exports.testOnly = {
  createRegExpsForQuery: createRegExpsForQuery
};
