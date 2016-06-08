"use strict";

var channelService = require('../../services/channel-service');
var restSerializer = require("../../serializers/rest-serializer");

module.exports = function(req, res, next) {
  var limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;

  channelService.findChannels(req.user, req.query.q, {limit: limit})
    .then(function(troupes) {
      var strategy = new restSerializer.SearchResultsStrategy({
        resultItemStrategy: new restSerializer.TroupeStrategy({ currentUserId: req.user.id })
      });

      return restSerializer.serializeObject({ results: troupes }, strategy);
    })
    .then(function(serialized) {
      res.send(serialized);
    })
    .catch(next);
};
