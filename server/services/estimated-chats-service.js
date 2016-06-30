"use strict";

var ChatMessage = require('gitter-web-persistence').ChatMessage;
var _ = require('lodash');
var Promise = require('bluebird');

function getEstimatedMessageCountForRoomId(roomId) {
  return ChatMessage.count({ toTroupeId: roomId })
    .read('secondaryPreferred')
    .exec();
}

function getEstimatedMessageCountForRoomIds(roomIds) {
  if (!roomIds || !roomIds.length) return {};
  if (roomIds.length === 1) {
    var singleId = roomIds[0];
    return getEstimatedMessageCountForRoomId(singleId)
      .then(function(count) {
        var hash = {};
        hash[singleId] = count;
        return hash;
      })

  }

  return ChatMessage.aggregate([{
      $match: { toTroupeId: { $in: roomIds } }
    }, {
      $group: {
        _id: "$toTroupeId",
        count: { $sum: 1 }
      }
    }])
    .read('secondaryPreferred')
    .exec()
    .then(function(results) {
      if (!results || !results.length) return {};
      return _.reduce(results, function(memo, result) {
        memo[result._id] = result.count;
        return memo;
      }, {});
    });
}

module.exports = {
  getEstimatedMessageCountForRoomId: Promise.method(getEstimatedMessageCountForRoomId),
  getEstimatedMessageCountForRoomIds: Promise.method(getEstimatedMessageCountForRoomIds)
};
