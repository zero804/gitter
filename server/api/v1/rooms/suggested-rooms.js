"use strict";

var restSerializer      = require("../../../serializers/rest-serializer");
var suggestions         = require('gitter-web-suggestions');
var loadTroupeFromParam = require('./load-troupe-param');

module.exports = {
  id: 'resourceTroupeSuggestedRoom',

  index: function(req) {
    return loadTroupeFromParam(req)
      .then(function(troupe) {
        return suggestions.getSuggestionsForRoom(troupe, req.user);
      })
      .then(function(suggestions) {
        return restSerializer.serialize(suggestions, new restSerializer.SuggestedRoomStrategy({ }));
      });
  }

};
