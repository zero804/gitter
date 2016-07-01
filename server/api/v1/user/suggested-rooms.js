"use strict";

var restSerializer = require("../../../serializers/rest-serializer");
var suggestionsService = require('../../../services/suggestions-service');
var StatusError = require('statuserror');

var EXPIRES_SECONDS = 180;
var EXPIRES_MILLISECONDS = 180 * 1000;

module.exports = {
  id: 'resourceUserSuggestedRoom',

  index: function(req, res) {
    if (!req.user) throw new StatusError(401);

    return suggestionsService.findSuggestionsForUserId(req.user.id)
      .then(function(suggestedRooms) {
        res.set('Cache-Control', 'public, max-age=' + EXPIRES_SECONDS);
        res.set('Expires', new Date(Date.now() + EXPIRES_MILLISECONDS).toUTCString());
        
        return restSerializer.serialize(suggestedRooms, new restSerializer.SuggestedRoomStrategy());
      });
  }
};
