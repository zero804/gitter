'use strict';

var hash        = require('./hash-avatar-to-cdn');
var BASE        = 'https://avatars';
var GITHUB_URL  = '.githubusercontent.com/';
var DEFAULT     = BASE + GITHUB_URL + 'u/0';

// make sure to pass the size for non-retina screens
module.exports = function (spec) {
  if (!spec || !spec.username) {
    /* Best we can do */
    return {
      src: DEFAULT,
      size: size
    };
  }

  var size = spec && spec.size || 30;
  var username = spec.username;
  var version = spec.version;

  var base = BASE + hash(username) + GITHUB_URL + username + '?' + (version ? 'v=' + version + '&' : '');
  var srcSize = size;
  if (typeof window !== 'undefined') {
    // fallback for retina displays without srcset support (e.g native android webviews)
    srcSize = size * (window.devicePixelRatio || 1);
  }

  return {
    src: base + 's=' + srcSize,
    size: size,
    srcset: base + 's=' + (size * 2) + ' 2x'
  };
};
