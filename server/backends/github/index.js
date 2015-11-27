'use strict';

var gitHubEmailAddressService = require('./github-email-address-service');
var restSerializer = require("../../serializers/rest-serializer");
var GithubMe = require('gitter-web-github').GitHubMeService;
var Mirror = require('gitter-web-github').GitHubMirrorService('user');
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
  // the minimum response
  var profile = {provider: 'github'};

  var githubUri = 'users/' + this.user.username;

  // erm. This uses the user we're looking up's tokens, not the user requesting
  // the lookup.
  var mirror = new Mirror(this.user);

  return mirror.get(githubUri)
    .then(function(body) {
      if (!body || !body.login) return profile;

      console.log(body);

      var blogUrl;
      if (body.blog) {
        if (!body.blog.match(/^https?:\/\//)) {
          blogUrl = 'http://' + body.blog;
        } else {
          blogUrl = body.blog;
        }
      }

      //standard
      profile.company = body.company;
      profile.location = body.location;
      profile.email = body.email;
      profile.website = blogUrl;
      profile.profile = body.html_url;

      // github-specific
      profile.followers = body.followers;
      profile.public_repos = body.public_repos;
      profile.following = body.following;

      console.log(profile);

      return profile;
    })
};

module.exports = GitHubBackend;
