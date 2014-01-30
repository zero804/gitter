/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q = require('q');
var wrap = require('./github-cache-wrapper');
var createClient = require('./github-client');
var badCredentialsCheck = require('./bad-credentials-check');
var request = require('request');
var assert = require('assert');

function Mirror(user) {
  this.user = user;
  this.client = createClient.user(user);
}

Mirror.prototype.get = function(uri) {
  var d = Q.defer();

  var options = {
    url: 'https://api.github.com/'+uri+'?access_token='+this.user.githubUserToken,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'gitter/0.0 (https://gitter.im) terminal/0.0'
    },
    json: true
  };

  request(options, d.makeNodeResolver());

  return d.promise.spread(function(response, body) {
    console.log(response);
    assert.strictEqual(response.statusCode, 200, 'Github sent an error code '+ response.statusCode);
    return body;
  }).fail(badCredentialsCheck);
};

// module.exports = Mirror;
module.exports = wrap(Mirror, function() {
  return [this.user && (this.user.githubUserToken || this.user.githubToken) || ''];
});
