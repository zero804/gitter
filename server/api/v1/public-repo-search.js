"use strict";

var repoService = require('../../services/repo-service');
var restSerializer = require("../../serializers/rest-serializer");

module.exports = function(req, res, next) {
  var limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;

  repoService.findPublicReposWithRoom(req.user, req.query.q, {limit: limit})
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
