/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q = require('q');
var wrap = require('./github-cache-wrapper');
var createClient = require('./github-client');
var badCredentialsCheck = require('./bad-credentials-check');

function GitHubMeService(user) {
  this.user = user;
  this.client = createClient.user(user);
}

GitHubMeService.prototype.getUser = function() {
  var d = Q.defer();

  var ghme = this.client.me();
  ghme.info(createClient.makeResolver(d));

  return d.promise
    .fail(badCredentialsCheck);
};

GitHubMeService.prototype.getEmail = function() {
  var d = Q.defer();
  var ghme = this.client.me();
  ghme.emailsDetailed(createClient.makeResolver(d));

  return d.promise
    .then(function(emailHashes) {
      var primaries = emailHashes.filter(function(hash) {
        return hash.primary;
      }).map(function(hash) {
        return hash.email;
      });

      return primaries[0];
    })
    .fail(badCredentialsCheck);

};

// TODO: evaluate with upcoming changes
GitHubMeService.prototype.getOrgs = function() {
  var d = Q.defer();

  var ghme = this.client.me();
  ghme.orgs(createClient.makeResolver(d));

  return d.promise
    .fail(badCredentialsCheck);
};

GitHubMeService.prototype.getOrgMembership = function(org) {
  var d = Q.defer();

  var ghme = this.client.me();
  ghme.getOrgMembership(org, createClient.makeResolver(d));

  return d.promise
    .fail(badCredentialsCheck);
};

GitHubMeService.prototype.isOrgAdmin = function(org) {
  return this.getOrgMembership(org)
    .then(function(membership) {
      if (!membership) return false;
      if (membership.state !== "active") return false;
      return membership.role === "admin";
    })
    .catch(function(err) {
      if (err.statusCode === 404) return false;
      throw err;
    });
};



// module.exports = GitHubMeService;
module.exports = wrap(GitHubMeService, function() {
  return [this.user && (this.user.githubUserToken || this.user.githubToken) || ''];
});
