"use strict";

var Group = require('gitter-web-persistence').Group;
var url = require('url');

var KNOWN_AVATAR_SIZES = [
  22,
  40,
  44,
  48,
  64,
  80,
  96,
  128
];

// Just in case
KNOWN_AVATAR_SIZES.sort();

/** Return the best size for the requested avatar size */
function getBestSizeFor(size) {
  for (var i = 0; i < KNOWN_AVATAR_SIZES.length; i++) {
    var currentSize = KNOWN_AVATAR_SIZES[i];
    if (size <= currentSize) return currentSize;
  }

  return null;
}

/**
 * Returns the optimal avatar url to return for the given size
 */
function getAvatarUrlForSize(avatarUrl, size) {
  var bestSize = getBestSizeFor(size);

  // Just use the original
  if (!bestSize) return avatarUrl;

  var parsed = url.parse(avatarUrl);
  var pathParts = parsed.pathname.split('/');
  pathParts.pop();
  pathParts.push(bestSize + '.png');
  parsed.pathname = pathParts.join('/');
  return url.format(parsed);
}

module.exports = function(groupId, size, isVersioned) {
  return Group.findById(groupId, { 'avatarUrl': 1, 'sd.type': 1, 'sd.linkPath': 1 }, { lean: true })
    .then(function(group) {
      if (!group) return null;

      // Use the custom URL if we have one
      if (group.avatarUrl) {
        return {
          url:  getAvatarUrlForSize(group.avatarUrl, size),
          longTermCachable: !!isVersioned
        };
      }

      var type = group.sd && group.sd.type;
      var linkPath = group.sd && group.sd.linkPath;

      if (!linkPath) return null;

      var githubUsername;

      switch(type) {
        case 'GH_ORG':
        case 'GH_USER':
          githubUsername = linkPath;
          break;

        case 'GH_REPO':
          githubUsername = linkPath.split('/')[0];
      }

      if (!githubUsername) return null;

      return {
        url: 'https://avatars.githubusercontent.com/' + githubUsername + '?s=' + size,
        longTermCachable: !!isVersioned
      };
    });
}
