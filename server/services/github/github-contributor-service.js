"use strict";

var wrap = require('./github-cache-wrapper');
var gittercat = require('./tentacles-client');
var userTokenSelector = require('./user-token-selector').full;

function GitHubContributorService(user) {
  this.user = user;
  this.accessToken = userTokenSelector(user);
}

/** Returns an array of usernames of all contributors to a repo */
GitHubContributorService.prototype.getContributors = function(repo) {
  return gittercat.repo.listContributors(repo, { accessToken: this.accessToken });
};

module.exports = wrap(GitHubContributorService, function() {
  return ['']; // Cache across all users NB NB NB NB
}, {
  policy: 'two-tier',
  hotTTL: 600,    /* 10 minutes cache */
  coldTTL: 14400, /* 4 hours cold cache */
  coolRefetchTimeout: 0.5 /* max time per call */
});

