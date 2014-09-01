"use strict";

var Q = require('q');
var wrap = require('./github-cache-wrapper');
var createClient = require('./github-client');
var badCredentialsCheck = require('./bad-credentials-check');

function GitHubContributorService(user) {
  this.user = user;
  this.client = createClient.full(user);
}

/** Returns an array of usernames of all contributors to a repo */
GitHubContributorService.prototype.getContributors = function(repo) {
  var d = Q.defer();

  var ghrepo = this.client.repo(repo);
  ghrepo.contributors(createClient.makeResolver(d));

  return d.promise
    .then(function(contributors) {
      if(!contributors) return [];

      return contributors;
    })
    .fail(badCredentialsCheck);
};

module.exports = wrap(GitHubContributorService, function() {
  return ['']; // Cache across all users NB NB NB NB
}, {
  policy: 'two-tier',
  hotTTL: 600,    /* 10 minutes cache */
  coldTTL: 43200, /* half a day cold cache */
  coolRefetchTimeout: 0.5 /* max time per call */
});

