/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var request = require('request');
var Q = require('q');
var wrap = require('./github-cache-wrapper');
var logFailingRequest = require('./log-failing-request');
var logRateLimit = require('./log-rate-limit');
var publicTokenPool = require('./public-token-pool');
var badCredentialsCheck = require('./bad-credentials-check');

// no retries or multipage requests, unlike request-wrapper
var loggedRequest = publicTokenPool(
                      logFailingRequest(
                        logRateLimit(
                          request)));


var Search = function(user) {
  this.token = user && (user.githubUserToken || user.githubToken) || '';
};

Search.prototype.findUsers = function(searchString, callback) {
  return requestGithubUserSearch(searchString, this.token)
    .then(function(body) {
      return body.items || [];
    })
    .nodeify(callback);
};

function requestGithubUserSearch(searchString, token) {
  var noOrgsQuerySearchString = 'q=' + searchString + '+type:user';
  var searchUrl = 'https://api.github.com/search/users?' + noOrgsQuerySearchString + '&access_token=' + token;

  var d = Q.defer();
  var options = {
    uri: searchUrl,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'gitter/0.0 (https://gitter.im) terminal/0.0'
    },
    json: true
  };

  loggedRequest(options, d.makeNodeResolver());

  return d.promise.spread(function(response, body) {
    if(response.statusCode >= 400) {
      throw response;
    }

    if(response.statusCode !== 200) {
      return response.statusCode;
    } else {
      return body;
    }
  }).fail(badCredentialsCheck);
}

module.exports = wrap(Search, function() {
  return [this.user && (this.user.githubUserToken || this.user.githubToken) || ''];
});
