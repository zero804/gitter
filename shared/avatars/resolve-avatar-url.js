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

  return (f > 0 ? f : -f) % 6; // defaults to 5 buckets;
}

function build(spec) {
  if (!spec || !spec.username) {
    /* Best we can do */
    return "https://avatars1.githubusercontent.com/u/0";
  }

  var username = spec.username;
  var version = spec.version;
  var size = spec.size || 30;

  return BASE + hash(username) + GITHUB_URL + username + '?' + (version ? 'v=' + version : '') + '&s=' + size;
}

var getPixelDensity = targetEnv.isBrowser ?
  function() { return window.devicePixelRatio || 1; } :
  function() { return 1; };

// make sure to pass the size for non-retina screens
module.exports = function (spec) {
  var pixelDensity = getPixelDensity();
  spec.size = (spec.size || 30) * pixelDensity;
  var url = build(spec);
  return url;
};
