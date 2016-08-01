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
  pathParts.push(bestSize);
  parsed.pathname = pathParts.join('/');
  return url.format(parsed);
}

module.exports = function(groupId, size, isVersioned) {
  var fields = { 'avatarUrl': 1, 'sd.type': 1, 'sd.linkPath': 1 };

  // only load the version if we're returning a versioned avatar
  if (isVersioned) {
    fields.avatarVersion = 1;
  }

  return Group.findById(groupId, fields, { lean: true })
    .then(function(group) {
      if (!group) return null;

      // Use the custom URL if we have one
      var avatarUrl;
      if (group.avatarUrl) {
        avatarUrl = getAvatarUrlForSize(group.avatarUrl, size);

        /*
        When returning a versioned avatar, tack on a param to the end to break
        through nginx's cache. Otherwise all versions cause nginx to download
        the same file which means the same downloaded avatar will be cached
        inside nginx for all versions and that cache is then shared among them
        all, defeating the purpose of the version param.

        This should break through that cache in nginx and S3 doesn't appear to
        mind the extra url param.
        */
        if (isVersioned) {
          avatarUrl = avatarUrl + '?v=' + group.avatarVersion;
        }

        return {
          url: avatarUrl,
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
