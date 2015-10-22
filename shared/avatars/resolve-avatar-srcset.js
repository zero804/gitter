'use strict';

var hash        = require('./hash-avatar-to-cdn');
var BASE        = 'https://avatars';
var GITHUB_URL  = '.githubusercontent.com/';

// make sure to pass the size for non-retina screens
module.exports = function (spec) {
  if (!spec || !spec.username) {
    /* Best we can do */
    return {
      src: "https://avatars1.githubusercontent.com/u/0",
    };
  }

  var size = spec && spec.size || 30;
  var username = spec.username;
  var version = spec.version;

  var base = BASE + hash(username) + GITHUB_URL + username + '?' + (version ? 'v=' + version + '&' : '');
  return {
    src: base + 's=' + size,
    srcset: base + 's=' + (size * 2) + ' 2x'
  };
};
