/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restSerializer  = require("../../serializers/rest-serializer");
var GithubMe        = require("../../services/github/github-me-service");

module.exports = {
  id: 'org',
  index: function(req, res, next) {
    if (!req.user) return res.send(403);

    var user = new GithubMe(req.user);

    var strategyOptions = { currentUserId: req.user.id };
    if (req.query.include_users) strategyOptions.mapUsers = true;

    return user.getOrgs()
      .then(function(ghOrgs) {
        var strategy = new restSerializer.GithubOrgStrategy(strategyOptions);

        return restSerializer.serializeQ(ghOrgs, strategy)
      })
      .then(function(serialized) {
        res.send(serialized);
      })
      .fail(next);
  }
};
