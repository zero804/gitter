"use strict";

var eventService   = require("../../../services/event-service");
var restSerializer = require("../../../serializers/rest-serializer");

module.exports = {
  id: 'event',

  index: function(req, res, next) {
    var skip = req.query.skip;
    var limit = req.query.limit;
    var beforeId = req.query.beforeId;

    var options = {
      skip: skip ? skip : 0,
      beforeId: beforeId ? beforeId : null,
      limit: limit ? limit: 50
    };

    eventService.findEventsForTroupe(req.params.troupeId, options, function(err, events) {
      if(err) return next(err);

      var strategy = new restSerializer.EventStrategy({ currentUserId: req.user.id, troupeId: req.params.troupeId });
      restSerializer.serialize(events, strategy, function(err, serialized) {
        if(err) return next(err);
        res.send(serialized);
      });
    });
  }

};
