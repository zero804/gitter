'use strict';

var env = require('gitter-web-env');
var stats = env.stats;
var logger = env.logger;
var Promise = require('bluebird');
var GitHubUserService = require('./github-user-service');
var GitHubRepoService = require('./github-repo-service');

var isValidEmail = require('email-validator').validate;

function GitHubUserEmailAddressService(user) {
  this.user = user;
}

/**
 * On behalf of the calling user, find another users email address, given their username.
 * Will use various discovery methods to attempt to find it.
 */
GitHubUserEmailAddressService.prototype.findEmailAddressForGitHubUser = Promise.method(function(username) {
  // attempt to get a public email address
  return this._getValidPublicEmailAddress(username)
    .bind(this)
    .then(function (email) {
      if (email) return email; // we have found a valid public email address

       // try get an email from commit
      return this._getEmailFromCommit(username)
        .then(function(email) {
          if(email && isValidEmail(email)) return email;
        });
    })
    .catch(function () {
      logger.warn('Unable to discover email address for GitHub user', { username: username });
      stats.event('github.email.discovery.failed'); // sadpanda
      return null;
    });
});

GitHubUserEmailAddressService.prototype._getValidPublicEmailAddress = function(username) {
  var ghUser = new GitHubUserService(this.user);
  return ghUser.getUser(username)
    .then(function(githubUser) {
      if(githubUser && githubUser.email && isValidEmail(githubUser.email)) {
        return githubUser.email;
      }
    });
}

// Try to get email from the user commits if the user has at least one repo
GitHubUserEmailAddressService.prototype._getEmailFromCommit = function(username) {
  var ghRepo = new GitHubRepoService(this.user);

  return ghRepo.getReposForUser(username, { firstPageOnly: true })
    .then(function(repos) {
      if (!repos.length) return null;

      var ownRepos = repos.filter(function(repo) { return repo.owner.login === username && !repo.fork; });
      var dates = ownRepos.map(function(repo) { return repo.pushed_at; }).sort().reverse();
      var latestRepo = ownRepos.filter(function(repo) { return repo.pushed_at === dates[0]; });
      var latestRepoName = latestRepo[0].full_name;

      return ghRepo.getCommits(latestRepoName, { firstPageOnly: true, author: username });
    })
    .then(function(commits) {
      if (!commits.length) return null;

      var ownCommits = commits.filter(function(commit) { return commit.author.login === username; });
      return (ownCommits[0] ? ownCommits[0].commit.author.email : null);
    });
}

module.exports = GitHubUserEmailAddressService;
