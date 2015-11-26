'use strict';

var gitHubEmailAddressService = require('./github-email-address-service');
var restSerializer = require("../../serializers/rest-serializer");
var GithubMe = require('gitter-web-github').GitHubMeService;
var Q = require('q');

function GitHubBackend(user, identity) {
  this.user = user;
  this.identity = identity;
}

GitHubBackend.prototype.getEmailAddress = function(preferStoredEmail) {
  return gitHubEmailAddressService(this.user, preferStoredEmail);
};

GitHubBackend.prototype.getSerializedOrgs = function() {
  var user = this.user;
  var ghUser = new GithubMe(user);
  return ghUser.getOrgs()
    .then(function(ghOrgs) {
      var strategyOptions = { currentUserId: user.id };
      var strategy = new restSerializer.GithubOrgStrategy(strategyOptions);
      return restSerializer.serializeExcludeNulls(ghOrgs, strategy);
    });
};

GitHubBackend.prototype.getProfile = function() {
  // TODO: get it all from github
  return Q.resolve({provider: 'github'});
};

module.exports = GitHubBackend;
