/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q = require('q');
var wrap = require('../github-cache-wrapper');
var badCredentialsCheck = require('../bad-credentials-check');
var request = require('request');
var assert = require('assert');

function Mirror(user) {
  assert(user, 'user required');
  var token = user.githubToken || user.githubUserToken;
  assert(token, 'token required');
  this.token = token;
}

Mirror.prototype.get = function(uri) {
  var d = Q.defer();

  var options = {
    url: 'https://api.github.com/'+uri+'?access_token='+this.token,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'gitter/0.0 (https://gitter.im) terminal/0.0'
    },
    json: true
  };

  request(options, d.makeNodeResolver());

  return d.promise.spread(function(response, body) {
    if(response.statusCode !== 200) {
      return response.statusCode;
    } else {
      return body;
    }
  }).fail(badCredentialsCheck);
};

// module.exports = Mirror;
module.exports = wrap(Mirror, function() {
  return [this.user && (this.user.githubToken || this.user.githubUserToken) || ''];
});
