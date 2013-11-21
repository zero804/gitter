/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restSerializer  = require("../../serializers/rest-serializer");
var GithubUser      = require("../../services/github/github-user-service");
var _               = require('underscore');

module.exports = {
  index: function(req, res, next) {
    if (!req.user) return res.send(403);

    var user = new GithubUser(req.user);

    user.getRepos()
    .then(function(ghRepos) {
      var repos = _.filter(ghRepos, function(repo) { return !repo.fork; }).map(function(repo) { return repo.full_name; });
      var strategy = new restSerializer.GitHubRepoStrategy({currentUserId: req.user.id});

      restSerializer.serialize(repos, strategy, function(err, serialized) {
        if(err) return next(err);
        res.send(serialized);
      });
    });
  }
};
