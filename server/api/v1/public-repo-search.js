/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var repoService = require('../../services/repo-service');
var restSerializer   = require("../../serializers/rest-serializer");

module.exports =  function(req, res, next) {
  var query = unescape(req.query.q);

  repoService.findPublicReposWithRoom(req.user,query)
  .then(function(repos) {

    var strategy = new restSerializer.SearchResultsStrategy({
                          resultItemStrategy: new restSerializer.GitHubRepoStrategy({ currentUserId: req.user.id, mapUsers: true })
                        });

    return restSerializer.serializeQ({ results: repos }, strategy);
  })
  .then(function(serialized) {
    res.send(serialized);
  })
  .fail(next);
};

