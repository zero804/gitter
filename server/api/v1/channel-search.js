/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var channelService = require('../../services/channel-service');
var restSerializer   = require("../../serializers/rest-serializer");

module.exports =  function(req, res, next) {
  channelService.findChannels(req.user, req.query.q)
    .then(function(troupes) {
      var strategy = new restSerializer.SearchResultsStrategy({
        resultItemStrategy: new restSerializer.TroupeStrategy({ currentUserId: req.user.id })
      });

      return restSerializer.serializeQ({ results: troupes }, strategy);
    })
    .then(function(serialized) {
      res.send(serialized);
    })
    .fail(next);
};
