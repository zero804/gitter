/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q = require('q');
var wrap = require('./github-cache-wrapper');
var createClient = require('./github-client');
var badCredentialsCheck = require('./bad-credentials-check');

function GitHubOrgService(user) {
  this.user = user;
  this.client = createClient.full(user);
}

/**
 * Returns the details of an org
 */
GitHubOrgService.prototype.getOrg = function(org) {
  var ghorg  = this.client.org(org);
  var d = Q.defer();
  ghorg.info(createClient.makeResolver(d));

  return d.promise
    .fail(badCredentialsCheck)
    .fail(function(err) {
      if(err.statusCode === 404) return null;
      throw err;
    });
};

/**
 * Returns the list of users with publisized membership to an organisation
 */
GitHubOrgService.prototype.members = function(org) {
  var ghorg  = this.client.org(org);
  var d = Q.defer();
  ghorg.members(createClient.makeResolver(d));
  return d.promise
    .fail(badCredentialsCheck);
};

GitHubOrgService.prototype.member = function(org, username) {
  var ghorg  = this.client.org(org);
  var d = Q.defer();
  ghorg.member(username, createClient.makeResolver(d));

  return d.promise
    .fail(badCredentialsCheck)
    .fail(function(err) {
      if(err.statusCode === 404) return false;
      throw err;
    });
};

GitHubOrgService.prototype.getRepos = function(org) {
  var ghorg  = this.client.org(org);
  var d = Q.defer();
  ghorg.repos(createClient.makeResolver(d));
  return d.promise
    .fail(badCredentialsCheck);

};

GitHubOrgService.prototype.getOwners = function(org) {
  var ghorg  = this.client.org(org);
  var d = Q.defer();
  var self = this;
  ghorg.teams(function(err, teams) {
    if (err) return d.reject(err);
    var owners = teams.filter(function(team) { if (team.slug === 'owners') return team; })[0];

    if (!owners) return d.reject(new Error('Org "' + org + '" has no owners team'));

    self.client.team(owners.id).members(createClient.makeResolver(d));
  });
  return d.promise
    .fail(badCredentialsCheck);
};


// module.exports = GitHubOrgService;
module.exports = wrap(GitHubOrgService, function() {
  return [this.user && (this.user.githubUserToken || this.user.githubToken) || ''];
});
