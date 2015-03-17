/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var url = require('url');
var StatusError = require('statuserror');
var Q = require('q');
var wrap = require('./github-cache-wrapper');
var badCredentialsCheck = require('./bad-credentials-check');
var request = require('./request-wrapper');

function repoTokenFirst(user) {
  return user && (user.githubToken || user.githubUserToken)  || '';
}

function userTokenFirst(user) {
  return user && (user.githubUserToken || user.githubToken) || '';
}

module.exports = function(tokenPriority) {
  var tokenStrategy;
  switch(tokenPriority) {
    case 'repo': tokenStrategy = repoTokenFirst; break;
    case 'user': tokenStrategy = userTokenFirst; break;
    default:
      throw new Error('Unknown token priority ' + tokenPriority);
  }

  function Mirror(user) {
    var token = tokenStrategy(user);
    this.token = token;
  }


  Mirror.prototype.get = function(uri) {
    var d = Q.defer();

    var u = url.parse(uri, true);

    u.protocol = 'https';
    u.hostname = 'api.github.com';
    var options = {
      method: 'GET',
      uri: url.format(u),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'gitter/0.0 (https://gitter.im) terminal/0.0'
      },
      json: true
    };

    if (this.token) {
      options.headers.Authorization = 'token ' + this.token;
    }

    request(options, d.makeNodeResolver());

    return d.promise.spread(function(response, body) {
      if(response.statusCode >= 400) {
        throw new StatusError(response.statusCode, body && body.message);
      }

      if(response.statusCode !== 200) {
        /* This is pretty dodgy.... */
        return response.statusCode;
      } else {
        return body;
      }
    }).fail(badCredentialsCheck);
  };

  // return Mirror;
  return wrap(Mirror, function() {
    return [tokenStrategy(this.user)];
  });
};

