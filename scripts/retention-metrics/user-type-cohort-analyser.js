/* jshint node:true, unused:true */
'use strict';

var _ = require('lodash');
var util = require("util");
var BaseRetentionAnalyser = require('./base-cohort-analyser');
var Troupe = require('../../server/services/persistence-service').Troupe;
var mongoUtils = require('../../server/utils/mongo-utils');

function UserRoomsRetentionAnalyser() {
  BaseRetentionAnalyser.apply(this, arguments);
}
util.inherits(UserRoomsRetentionAnalyser, BaseRetentionAnalyser);

UserRoomsRetentionAnalyser.prototype.categoriseUsers = function(allCohortUsers, callback) {
  var self = this;

  var userIds = _(allCohortUsers).values().flatten().map(mongoUtils.asObjectID).value();

  Troupe.aggregate([
    { $match: {'users.userId': { $in: userIds } } },
    { $project: { githubType: 1, security: 1, users: 1, _id: 0} },
    { $unwind: '$users'  },
    { $project: { githubType: 1, security: 1, userId: "$users.userId" } },
    { $match: { userId: { $in: userIds } } },
    { $group: { _id: "$userId", roomTypes: { $push: { githubType: "$githubType", security: "$security" } } }}

    ], function(err, result) {
      if(err) return callback(err);

      var indexed = result.reduce(function(memo, r) {
        memo[r._id] = r.roomTypes;
        return memo;
      }, {});

      var categorised = _(userIds)
        .transform(function(memo, userId) {
          memo[userId] = self.bucketFor(indexed[userId] || []);
          return memo;
        }, {})
        .value();

      callback(null, categorised);
    });
};

UserRoomsRetentionAnalyser.prototype.bucketFor = function(roomsList) {
  if(roomsList.length === 0) return "none";

  var roomPrivacy = roomsList.map(function(roomType) {
    if(roomType.githubType === 'ORG') return 'private';
    if(roomType.githubType === 'ONETOONE') return 'onetoone';

    if(roomType.security === 'PRIVATE') return 'private';
    if(roomType.security === 'PUBLIC') return 'public';
    if(roomType.security === 'INHERITED') return 'private'; // Not strictly true, but good enough for now

    console.log('NO classification for ', roomType);
  });

  if (roomPrivacy.every(function(f) { return f === 'private'; })) return 'private';
  if (roomPrivacy.every(function(f) { return f === 'public'; })) return 'public';
  if (roomPrivacy.every(function(f) { return f === 'private' || f === 'onetoone'; })) return 'private-onetoone';
  if (roomPrivacy.every(function(f) { return f === 'public' || f === 'onetoone'; })) return 'public-onetoone';

  return 'mixed';
};


module.exports = UserRoomsRetentionAnalyser;
