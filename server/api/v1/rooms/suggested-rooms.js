"use strict";

var Promise = require('bluebird');
var _ = require('lodash');
var restSerializer = require("../../../serializers/rest-serializer");
var suggestions = require('gitter-web-suggestions');
var loadTroupeFromParam = require('./load-troupe-param');
var roomMembershipService = require('../../../services/room-membership-service');
var collections = require('../../../utils/collections');
var troupeService = require('../../../services/troupe-service');

module.exports = {
  id: 'resourceTroupeSuggestedRoom',

  index: function(req) {
    var userId = req.user._id;

    return loadTroupeFromParam(req)
      .then(function(troupe) {
        return Promise.join(
          suggestions.getSuggestionsForRoom(troupe, req.user),
          userId && roomMembershipService.findRoomIdsForUser(userId),
          function(roomIds, existingRoomIds) {
            if (!roomIds || !roomIds.length) {
              return [];
            }

            if (existingRoomIds) {
              // Remove any existing
              var idMap = collections.hashArray(existingRoomIds);

              roomIds = _.filter(roomIds, function(roomId) {
                return !idMap[roomId];
              });
            }

            roomIds = roomIds.slice(0, 12);
            return troupeService.findByIdsLean(roomIds);
          }
        );
      })
      .then(function(suggestedRooms) {
        return restSerializer.serialize(suggestedRooms, new restSerializer.SuggestedRoomStrategy({ }));
      });
  }

};
