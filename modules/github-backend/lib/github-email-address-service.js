'use strict';

var env = require('gitter-web-env');
var stats = env.stats;

var Promise = require('bluebird');
var github = require('gitter-web-github');
var GitHubMeService = github.GitHubMeService;
var GitHubUserService = github.GitHubUserService;
var GitHubRepoService = github.GitHubRepoService;

var isValidEmail = require('email-validator').validate;

function getPrivateEmailAddress(user) {
  var ghMe = new GitHubMeService(user);
  return ghMe.getEmail();
}

function getValidPublicEmailAddress(username) {
  var ghUser = new GitHubUserService();
  return ghUser.getUser(username)
    .then(function(user) {
      if(user && user.email && isValidEmail(user.email)) {
        return user.email;
      }
    });
}

// Try to get email from the user commits if the user has at least one repo
function getEmailFromCommit(user) {
  var ghRepo = new GitHubRepoService(user);

  return ghRepo.getReposForUser(user.username, {firstPage: true})
  .then(function(repos) {
    if (!repos.length) return null;

    var ownRepos = repos.filter(function(repo) { return repo.owner.login === user.username && !repo.fork; });
    var dates = ownRepos.map(function(repo) { return repo.pushed_at; }).sort().reverse();
    var latestRepo = ownRepos.filter(function(repo) { return repo.pushed_at === dates[0]; });
    var latestRepoName = latestRepo[0].full_name;

    return ghRepo.getCommits(latestRepoName, {firstPage: true, author: user.username});
  })
  .then(function(commits) {
    if (!commits.length) return null;

    var ownCommits = commits.filter(function(commit) { return commit.author.login === user.username; });
    return (ownCommits[0] ? ownCommits[0].commit.author.email : null);
  });
}

module.exports = Promise.method(function gitHubEmailAddressService(user, options) {
  if (user.githubUserToken || user.githubToken) {
    return getPrivateEmailAddress(user);
  }

  if (!options || !options.attemptDiscovery) return null;

  // attempt to get a public email address
  return getValidPublicEmailAddress(user.username)
    .then(function (email) {
      if (email) return email; // we have found a public email address

       // try get an email from commit
      return getEmailFromCommit(user)
        .then(function(email) {
          if(email && isValidEmail(email)) return email;
        });
    })
    .catch(function () {
      stats.event('github.email.discovery.failed', { username: user.username }); // sadpanda
      return null;
    });
});
