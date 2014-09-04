/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence     = require("./persistence-service");
var Q               = require('q');

function createRegExpsForQuery(queryText) {
  var normalized = ("" + queryText).trim().toLowerCase();
  var parts = normalized.split(/[\s\'']+/)
                        .filter(function(s) { return !!s; })
                        .filter(function(s, index) { return index < 10; } );

  return parts.map(function(i) {
    return new RegExp("\\b" + i.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
  });
}


function findPublicChannels(user, query) {

  var filters = createRegExpsForQuery(query);
  if(!filters.length) return Q.resolve([]);

  var filterQueries = filters.map(function(re) {
    return { lcUri: re };
  });

  return persistence.Troupe
    .find({
      $and: filterQueries,
      $or: [
        { security: 'PUBLIC' },
        { security: null },
        { security: { $exists: false } }
      ],
      githubType: { $in: ['REPO_CHANNEL', 'ORG_CHANNEL', 'USER_CHANNEL'] }
    })
    .limit(20)
    .execQ()
    .then(function(troupes) {
      return Q.all(troupes.filter(function(troupe) {
        return troupe.security === 'PUBLIC' || !troupe.security;
      }));
    });
}

function findPrivateChannelsWithUser(user, query) {

  var filters = createRegExpsForQuery(query);
  if(!filters.length) return Q.resolve([]);

  var filterQueries = filters.map(function(re) {
    return { lcUri: re };
  });

  return persistence.Troupe
    .find({
      $and: filterQueries,
      users: { $elemMatch: { userId: user.id } },
      security: 'PRIVATE',
      githubType: { $in: ['REPO_CHANNEL', 'ORG_CHANNEL', 'USER_CHANNEL'] }
    })
    .limit(20)
    .execQ();
}

function findChannels(user, query) {
  return Q.all([
    findPublicChannels(user, query),
    findPrivateChannelsWithUser(user, query)
  ])
  .spread(function(publicChannels, privateChannels) {
    return publicChannels.concat(privateChannels);
  });
}

exports.findChannels = findChannels;
