'use strict';

var targetEnv   = require('targetenv');
var hash        = require('./hash-avatar-to-cdn');
var BASE        = 'https://avatars';
var GITHUB_URL  = '.githubusercontent.com/';

var getPixelDensity = targetEnv.isBrowser ?
  function() { return window.devicePixelRatio || 1; } :
  function() { return 1; };

// make sure to pass the size for non-retina screens
module.exports = function (spec) {
  if (!spec || !spec.username) {
    /* Best we can do */
    return "https://avatars1.githubusercontent.com/u/0";
  }

  var username = spec.username;
  var version = spec.version;
  var pixelDensity = getPixelDensity();
  var size = (spec.size || 30) * pixelDensity;

  return BASE + hash(username) + GITHUB_URL + username + '?' + (version ? 'v=' + version : '') + '&s=' + size;
};
