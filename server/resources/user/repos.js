/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restSerializer   = require("../../serializers/rest-serializer");
var repoService      = require("../../services/repo-service");
var createTextFilter = require('text-filter');

function indexQuery(req, res, next) {
  var options = {
    limit: req.query.limit,
    skip: req.query.skip
  };

  var search = repoService.getReposForUser(req.user);

  return search.then(function(repos) {
      var filteredRepos = repos.filter(createTextFilter({ query: req.query.q, fields: ['name', 'full_name', 'description']}));

      var strategy = new restSerializer.SearchResultsStrategy({
                            resultItemStrategy: new restSerializer.GitHubRepoStrategy({ currentUserId: req.user.id, mapUsers: true })
                          });

      return restSerializer.serializeQ({ results: filteredRepos }, strategy);
    })
    .then(function(serialized) {
      res.send(serialized);
    })
    .fail(next);
}

module.exports = {
  index: function(req, res, next) {
    if(req.query.q) {
      return indexQuery(req, res, next);
    }

    repoService.suggestedReposForUser(req.user)
      .then(function(repos) {
        var strategy = new restSerializer.GitHubRepoStrategy({ currentUserId: req.user.id, mapUsers: true });

        restSerializer.serialize(repos, strategy, function(err, serialized) {
          if(err) return next(err);

          res.send(serialized);
        });
      })
      .fail(next);
  }
};
