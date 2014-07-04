/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restSerializer   = require("../../serializers/rest-serializer");
var repoService      = require("../../services/repo-service");
var createTextFilter = require('text-filter');

function getDefaultReposSuggestions() {
  return repoService.findReposByUris([
    'gitterHQ/gitter',
    'gitterHQ/developers',
    'gitterHQ/rhubarb'
  ]);
}

function indexQuery(req, res, next) {
  var search = repoService.getReposForUser(req.user);

  return search.then(function(repos) {
      var filteredRepos = repos.filter(createTextFilter({ query: req.query.q, fields: ['name', 'full_name', 'description']}));

      var strategyOptions = { currentUserId: req.user.id };
      if (req.query.include_users) strategyOptions.mapUsers = true;

      var strategy = new restSerializer.SearchResultsStrategy({
                            resultItemStrategy: new restSerializer.GithubRepoStrategy(strategyOptions)
                          });

      return restSerializer.serializeQ({ results: filteredRepos }, strategy);
    })

    .then(function(serialized) {
      res.send(serialized);
    })
    .fail(next);
}

module.exports = {
  id: 'repo',
  index: function(req, res, next) {
    if(req.query.q) {
      return indexQuery(req, res, next);
    }

    var strategyOptions = { currentUserId: req.user.id };
    if (req.query.include_users) strategyOptions.mapUsers = true;

    repoService.suggestedReposForUser(req.user)
      .then(function(repos) {
        if(repos.length) return repos;

        return getDefaultReposSuggestions();
      })
      .then(function(repos) {
        var strategy = new restSerializer.GithubRepoStrategy(strategyOptions);

        restSerializer.serialize(repos, strategy, function(err, serialized) {
          if(err) return next(err);

          res.send(serialized);
        });
      })
      .fail(next);
  }
};
