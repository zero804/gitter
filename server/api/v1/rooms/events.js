"use strict";

var eventService   = require("../../../services/event-service");
var restSerializer = require("../../../serializers/rest-serializer");

module.exports = {
  id: 'event',

  index: function(req) {
    var skip = req.query.skip;
    var limit = req.query.limit;
    var beforeId = req.query.beforeId;

    var options = {
      skip: skip ? skip : 0,
      beforeId: beforeId ? beforeId : null,
      limit: limit ? limit: 50
    };

    return eventService.findEventsForTroupe(req.params.troupeId, options)
      .then(function(events) {
        var strategy = new restSerializer.EventStrategy({ currentUserId: req.user.id, troupeId: req.params.troupeId });
        return restSerializer.serialize(events, strategy);
      });

  }

};
