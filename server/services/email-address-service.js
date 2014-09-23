/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env = require('../utils/env');
var config = env.config;
var stats  = env.stats;

var Q = require('q');
var GitHubMeService = require('./github/github-me-service');
var GitHubUserService = require('./github/github-user-service');
var GitHubRepoService = require('./github/github-repo-service');

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
function getEmailFromCommit(user, _user) {
  var ghRepo = new GitHubRepoService(_user || user);

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

module.exports = function (user, _user) {
  if (!user) return Q.reject(new Error('User required'));
  
  // test email address, should be set in `config.user-overrides.json`
  if (config.get('email:toAddress')) return Q.resolve(config.get('email:toAddress')); 

  if (user.githubUserToken || user.githubToken) { return getPrivateEmailAddress(user); }
  
  return getValidPublicEmailAddress(user.username)
  .then(function(email) {
    if (email) return email;
    return getEmailFromCommit(user, _user);
  })
  .then(function(emailFromCommit) {
    if (emailFromCommit) return emailFromCommit;
    stats.event('email-from-commit-failed', {username: user.username}); // sadpanda
    return null;
  })
  .fail(function() {
    return null;
  });
};
