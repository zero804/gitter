"use strict";

var restSerializer = require("../../../serializers/rest-serializer");
var suggestions    = require('gitter-web-suggestions');
var paramLoaders   = require('./param-loaders');

module.exports = {
  id: 'resourceTroupeSuggestedRoom',

  index: [paramLoaders.troupeLoader, function(req, res, next) {
    return suggestions.getSuggestionsForRoom(req.troupe, req.user)
      .then(function(suggestions) {
        return restSerializer.serialize(suggestions, new restSerializer.SuggestedRoomStrategy({ }));
      })
      .then(function(serialized) {
        return res.send(serialized);
      })
      .catch(next);
  }]

};
