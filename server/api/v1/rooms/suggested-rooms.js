"use strict";

var Promise = require('bluebird');
var _ = require('lodash');
var restSerializer = require("../../../serializers/rest-serializer");
var suggestions = require('gitter-web-suggestions');
var loadTroupeFromParam = require('./load-troupe-param');
var roomMembershipService = require('../../../services/room-membership-service');
var collections = require('../../../utils/collections');

module.exports = {
  id: 'resourceTroupeSuggestedRoom',

  index: function(req) {
    var userId = req.user._id;

    return loadTroupeFromParam(req)
      .then(function(troupe) {
        return Promise.join(
          suggestions.getSuggestionsForRoom(troupe, req.user),
          userId && roomMembershipService.findRoomIdsForUser(userId),
          function(suggestions, existingRoomIds) {
            if (!suggestions || !suggestions.length) {
              return [];
            }

            if (existingRoomIds) {
              // Remove any existing
              var idMap = collections.hashArray(existingRoomIds);

              suggestions = _.reject(suggestions, function(suggestion) {
                return idMap[suggestion.roomId];
              });
            }

            return suggestions.slice(0, 12);
          }
        );
      })
      .then(function(suggestions) {
        return restSerializer.serialize(suggestions, new restSerializer.SuggestedRoomStrategy({ }));
      });
  }

};
