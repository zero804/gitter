/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restSerializer = require("../../serializers/rest-serializer");
var suggestions    = require('gitter-web-suggestions');

module.exports = {
  id: 'resourceTroupeSuggestedRoom',

  index: function(req, res, next) {
    return suggestions.getSuggestionsForRoom(req.troupe, req.user)
      .then(function(suggestions) {
        return restSerializer.serializeQ(suggestions, new restSerializer.SuggestedRoomStrategy({ }));
      })
      .then(function(serialized) {
        return res.send(serialized);
      })
      .fail(next);
  }

};
