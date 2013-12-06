/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q = require('q');
var wrap = require('./github-cache-wrapper');
var createClient = require('./github-client');

function GitHubUserService(user) {
  this.user = user;
  this.client = createClient.user(user);
}

GitHubUserService.prototype.getUser = function(user) {
  var d = Q.defer();

  var ghuser = this.client.user(user);
  ghuser.info(d.makeNodeResolver());

  return d.promise
    .fail(function(err) {
      if(err.statusCode === 404) return null;
      throw err;
    });
};

module.exports = wrap(GitHubUserService, function() {
  return [this.user && (this.user.githubUserToken || this.user.githubToken) || ''];
});

