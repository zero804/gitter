/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restSerializer   = require("../../../serializers/rest-serializer");
var repoService      = require("../../../services/repo-service");
var createTextFilter = require('text-filter');

function indexQuery(req, res, next) {
  var limit = req.query.limit ? parseInt(req.query.limit, 10) : 0;

  return repoService.getReposForUser(req.user)
    .then(function(repos) {

      var query = (req.query.q || '').replace(/\*|\+|\$/g, '');
      var filteredRepos = repos.filter(createTextFilter({ query: query, fields: ['full_name']}));

      var strategyOptions = { currentUserId: req.user.id };
      // if (req.query.include_users) strategyOptions.mapUsers = true;

      var strategy = new restSerializer.SearchResultsStrategy({
                            resultItemStrategy: new restSerializer.GithubRepoStrategy(strategyOptions)
                          });

      if(limit) {
        filteredRepos = filteredRepos.slice(0, limit + 1);
      }

      return restSerializer.serializeQ({ results: filteredRepos }, strategy);
    })

    .then(function(serialized) {
      res.send(serialized);
    })
    .catch(next);
}

module.exports = {
  id: 'repo',
  index: function(req, res, next) {
    if(req.query.q) {
      return indexQuery(req, res, next);
    }

    var strategyOptions = { currentUserId: req.user.id };
    // if (req.query.include_users) strategyOptions.mapUsers = true;

    repoService.getReposForUser(req.user)
      .then(function(repos) {
        var strategy = new restSerializer.GithubRepoStrategy(strategyOptions);

        restSerializer.serialize(repos, strategy, function(err, serialized) {
          if(err) return next(err);

          res.send(serialized);
        });
      })
      .catch(next);
  }
};
