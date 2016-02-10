"use strict";

var persistence           = require("./persistence-service");
var Promise               = require('bluebird');
var roomMembershipService = require('./room-membership-service');

function createRegExpsForQuery(queryText) {
  var normalized = ("" + queryText).trim().toLowerCase();
  var parts = normalized.split(/[\s\'']+/)
                        .filter(function(s) { return !!s; })
                        .filter(function(s, index) { return index < 10; } );

  return parts.map(function(i) {
    return new RegExp("\\b" + i.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
  });
}


function findPublicChannels(user, query, options) {

  var filters = createRegExpsForQuery(query);
  if(!filters.length) return Promise.resolve([]);

  var filterQueries = filters.map(function(re) {
    return { lcUri: re };
  });

  return persistence.Troupe
    .find({
      $and: filterQueries,
      security: 'PUBLIC',
      githubType: { $in: ['REPO_CHANNEL', 'ORG_CHANNEL', 'USER_CHANNEL'] }
    })
    .limit(options.limit || 20)
    .exec()
    .then(function(troupes) {
      return troupes.filter(function(troupe) {
        return troupe.security === 'PUBLIC' || !troupe.security;
      });
    });
}

function findPrivateChannelsWithUser(user, query, options) {
  var filters = createRegExpsForQuery(query);
  if(!filters.length) return Promise.resolve([]);

  return roomMembershipService.findRoomIdsForUser(user._id)
    .then(function(membershipTroupeIds) {
      if (!membershipTroupeIds.length) return [];

      var filterQueries = filters.map(function(re) {
        return { lcUri: re };
      });

      return persistence.Troupe
        .find({
          $and: filterQueries,
          _id: { $in: membershipTroupeIds },
          security: 'PRIVATE',
          githubType: { $in: ['REPO_CHANNEL', 'ORG_CHANNEL', 'USER_CHANNEL'] }
        })
        .limit(options.limit || 20)
        .exec();
    });
}

function findChannels(user, query, options) {
  options = options || {};

  return Promise.join(
    findPublicChannels(user, query, options),
    findPrivateChannelsWithUser(user, query, options),
    function(publicChannels, privateChannels) {
      return publicChannels.concat(privateChannels);
    });
}

exports.findChannels = findChannels;
