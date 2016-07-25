'use strict';

var avatars = require('..');

function asSourceSet(avatarServerUrl, size) {
  if (!avatarServerUrl) {
    return {
      src: avatars.getDefault(),
      size: size,
      srcset: ''
    };
  }

  return {
    src: avatarServerUrl + '?s=' + size,
    size: size,
    srcset: avatarServerUrl + '?s=' + (size * 2) + ' 2x'
  };
}

module.exports = asSourceSet;
