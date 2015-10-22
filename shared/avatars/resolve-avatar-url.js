'use strict';

var targetEnv   = require('targetenv');
var BASE        = 'https://avatars';
var GITHUB_URL  = '.githubusercontent.com/';

function hash(str) {
  if (!str || !str.length) return 1;

  /* djb2: http://www.cse.yorku.ca/~oz/hash.html */
  var f = 5381;
  for(var i = 0; i < str.length && i < 8; i++) { // Limit to the first 8 chars
    f = ((f << 5) + f) + str.charCodeAt(i); /* hash * 33 + c */
  }

  return (f > 0 ? f : -f) % 3; // defaults to 4 buckets;
}

function build(spec) {
  if (!spec || !spec.username) {
    /* Best we can do */
    return "https://avatars1.githubusercontent.com/u/0";
  }

  var username = spec.username;
  var version = spec.version;
  var size = spec.size || 60;

  if (username.indexOf('_') == -1) {
    // github namespace
    return BASE + hash(username) + GITHUB_URL + username + '?' + (version ? 'v=' + version : '') + '&s=' + size;
  } else {
    // not github, send to resolver
    return '/api/private/user-avatar/'+username+'?s='+size;
  }
}

// make sure to pass the size for non-retina screens
module.exports = function resolveAvatarUrl(spec) {
  spec.size = spec.size || 60;
  var url = build(spec);
  return url;
};
