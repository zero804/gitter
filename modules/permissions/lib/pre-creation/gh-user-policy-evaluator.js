
'use strict';

var Promise = require('bluebird');
var isGitHubUser = require('gitter-web-identity/lib/is-github-user');

function GitHubRepoPolicyEvaluator(user, uri) {
  this.user = user;
  this.uri = uri;

  // TODO: currently assumes githubUsername == username
  this._access = isGitHubUser(user) && !!(user.username && user.username === uri);
}

GitHubRepoPolicyEvaluator.prototype = {
  canRead: Promise.method(function() {
    return this._access;
  }),

  canWrite: Promise.method(function() {
    return this._access;
  }),

  canJoin: Promise.method(function() {
    return this._access;
  }),

  canAdmin: Promise.method(function() {
    return this._access;
  }),

  canAddUser: Promise.method(function() {
    // You can never add a user to a room which has not yet been created
    return false;
  }),

};

module.exports = GitHubRepoPolicyEvaluator;
