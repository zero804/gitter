/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var suggestedRoomsService = require('../../services/suggested-room-service');
var restSerializer        = require("../../serializers/rest-serializer");

module.exports = {
  id: 'resourceTroupeSuggestedRoom',

  index: function(req, res, next) {

    return suggestedRoomsService.getSuggestionsForRoom(req.troupe, req.user)
      .then(function(suggestions) {
        return restSerializer.serializeQ(suggestions, new restSerializer.SuggestedRoomStrategy({ }));
      })
      .then(function(serialized) {
        return res.send(serialized);
      })
      .fail(next);
  }

};
