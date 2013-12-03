/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var repoService     = require("../../services/repo-service");
var restSerializer  = require("../../serializers/rest-serializer");
var _               = require("underscore");

module.exports = function(req, res, next) {

    repoService.getReposForUser(req.user)
      .then(function(repos) {
        var strategy = new restSerializer.GitHubRepoStrategy({ currentUserId: req.user.id });

        var regexp = new RegExp(req.query.q);
        var filtered_repos = _.filter(repos, function(repo) { return repo.name.match(regexp); });

        restSerializer.serialize(filtered_repos, strategy, function(err, serialized) {
          if(err) return next(err);

          res.send(serialized);
        });
      })
      .fail(next);

};
