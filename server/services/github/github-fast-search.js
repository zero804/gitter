/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q = require('q');
var wrap = require('./github-cache-wrapper');
var badCredentialsCheck = require('./bad-credentials-check');
var requestWrapper = require('./request-wrapper');
var StatusError = require('statuserror');

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
  var encodedSearchString = encodeURIComponent(searchString);

  // the '+type:user' part gets mangled by url encoders, so we have to do this by hand
  var noOrgsQuerySearchString = 'q=' + encodedSearchString + '+type:user';
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

  requestWrapper.fastRequest(options, d.makeNodeResolver());

  return d.promise.spread(function(response, body) {
    if(response.statusCode !== 200) throw new StatusError(response.statusCode, 'github user search failed');

    return body;
  }).fail(badCredentialsCheck);
}

module.exports = wrap(Search, function() {
  return [this.user && (this.user.githubUserToken || this.user.githubToken) || ''];
});
