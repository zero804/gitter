/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var restSerializer  = require("../../serializers/rest-serializer");
var GithubUser      = require("../../services/github/github-user-service");
var _               = require('underscore');

module.exports = {
  index: function(req, res, next) {
    if (!req.user) return res.send(403);

    var user = new GithubUser(req.user);

    user.getOrgs()
    .then(function(ghOrgs) {
      var orgs = _.map(ghOrgs, function(org) { return org.login; });
      var strategy = new restSerializer.GitHubOrgStrategy({currentUserId: req.user.id});

      restSerializer.serialize(ghOrgs, strategy, function(err, serialized) {
        if(err) return next(err);
        res.send(serialized);
      });
    });
  }
};
