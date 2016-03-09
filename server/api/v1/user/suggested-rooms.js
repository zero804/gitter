"use strict";

var Promise = require('bluebird');
var restSerializer = require("../../../serializers/rest-serializer");
var roomMembershipService = require('../../../services/room-membership-service');
var suggestionsService = require('../../../services/suggestions-service');
var userSettingsService = require('../../../services/user-settings-service');
var troupeService = require('../../../services/troupe-service');
var StatusError = require('statuserror');
var _ = require('lodash');

module.exports = {
  id: 'resourceUserSuggestedRoom',

  index: function(req) {
    // TODO: cache wrap this
    if (!req.user) throw new StatusError(401);

    return Promise.all([
      roomMembershipService.findRoomIdsForUser(req.user.id)
        .then(function(roomIds) {
          return troupeService.findByIdsLean(roomIds, {
            uri: 1,
            lcOwner: 1,
            lang: 1,
            oneToOne: 1
          });
        }),
      userSettingsService.getUserSettings(req.user.id, 'lang')
    ])
    .spread(function(user, existingRooms, language) {
      return suggestionsService.findSuggestionsForRooms(user, existingRooms, language);
    })
    .then(function(suggestedRooms) {
      return restSerializer.serialize(suggestedRooms, new restSerializer.SuggestedRoomStrategy());
    });
  }
};
