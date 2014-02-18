/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q = require('q');
var wrap = require('./github-cache-wrapper');
var createClient = require('./github-client');
var badCredentialsCheck = require('./bad-credentials-check');
var request = require('./request-wrapper');
var assert = require('assert');

function GitHubMeService(user) {
  this.user = user;
  this.client = createClient.user(user);
}

GitHubMeService.prototype.getUser = function() {
  var d = Q.defer();

  var ghme = this.client.me();
  ghme.info(d.makeNodeResolver());

  return d.promise
    .fail(badCredentialsCheck);
};

GitHubMeService.prototype.getEmail = function() {
  /** TODO: add this into octonode and use the same pattern as the rest of the github calls!!!!!
   *  Sort it out.
   */
  var d = Q.defer();

  /* USE OCTONODE !!! */
  var token = this.user.githubUserToken || this.user.githubToken || '';

  var options = {
    url: 'https://api.github.com/user/emails?access_token=' + token,
    headers: {
      'Accept': 'application/vnd.github.v3.full+json',
      'Content-Type': 'application/json',
      'User-Agent': 'gitter/0.0 (https://gitter.im) terminal/0.0'
    },
    json: true
  };

  request(options, d.makeNodeResolver());

  return d.promise.spread(function(response, emailHashes) {
    assert.strictEqual(response.statusCode, 200, 'Github sent an error code: '+response.statusCode);

    var primaryEmails = emailHashes.filter(function(hash) {
      return hash.primary && hash.verified;
    }).map(function(hash) {
      return hash.email;
    });

    return primaryEmails.length ? primaryEmails[0] : undefined;
  }).fail(badCredentialsCheck);
};

GitHubMeService.prototype.getOrgs = function() {
  var d = Q.defer();

  var ghme = this.client.me();
  ghme.orgs(d.makeNodeResolver());

  return d.promise
    .fail(badCredentialsCheck);
};

// module.exports = GitHubMeService;
module.exports = wrap(GitHubMeService, function() {
  return [this.user && (this.user.githubUserToken || this.user.githubToken) || ''];
});

