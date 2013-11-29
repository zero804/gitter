/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restSerializer  = require("../../serializers/rest-serializer");
var repoService     = require("../../services/repo-service");

module.exports = {
  index: function(req, res, next) {
    if (!req.user) return res.send(403);


    repoService.suggestedReposForUser(req.user)
      .then(function(repos) {
        var strategy = new restSerializer.GitHubRepoStrategy({ currentUserId: req.user.id });

        restSerializer.serialize(repos, strategy, function(err, serialized) {
          if(err) return next(err);

          res.send(serialized);
        });
      })
      .fail(next);
  }
};
