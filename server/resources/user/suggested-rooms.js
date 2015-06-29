/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var suggestedRoomsService = require('../../services/suggested-room-service');
var restSerializer        = require("../../serializers/rest-serializer");

module.exports = {
  id: 'resourceUserSuggestedRoom',

  index: function(req, res, next) {
    if(!req.user) {
      return res.send(403);
    }

    return suggestedRoomsService.getSuggestionsForUser(req.user, req.i18n.getLocale())
      .then(function(suggestions) {
        return restSerializer.serializeQ(suggestions, new restSerializer.SuggestedRoomStrategy({ }));
      })
      .then(function(serialized) {
        return res.send(serialized);
      })
      .fail(next);
  }

};
