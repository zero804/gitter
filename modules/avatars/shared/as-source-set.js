'use strict';

function asSourceSet(avatarServerUrl, size) {
  return {
    src: avatarServerUrl + '?s=' + size,
    size: size,
    srcset: avatarServerUrl + '?s=' + (size*2) + ' 2x'
  };
}

module.exports = asSourceSet;
