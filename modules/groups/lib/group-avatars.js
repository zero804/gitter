'use strict';

var env = require('gitter-web-env');
var errorReporter = env.errorReporter;
var Group = require('gitter-web-persistence').Group;
var url = require('url');
var mongoReadPrefs = require('gitter-web-persistence-utils/lib/mongo-read-prefs');
var groupAvatarUpdater = require('./group-avatar-updater');
var debug = require('debug')('gitter:app:groups:group-avatars');
var mongoUtils = require('gitter-web-persistence-utils/lib/mongo-utils');

/**
 * Check on avatars once a week. In future, we may bring this
 * down or come up with an alternative method of looking
 * this up.
 */
var AVATAR_VERSION_CHECK_TIMEOUT = 7 * 86400 * 1000;

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

var SELECT_FIELDS = {
  _id: 0,
  avatarUrl: 1,
  avatarVersion: 1,
  avatarCheckedDate: 1,
  'sd.type': 1,
  'sd.linkPath': 1
};

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

/**
 * Rely on the secondary, but if that doesn't find a recently
 * created group, fallback to querying the primary
 */
function findOnSecondaryOrPrimary(groupId) {
  return Group.findById(groupId, SELECT_FIELDS, { lean: true })
    .read(mongoReadPrefs.secondaryPreferred)
    .then(function(group) {
      if (group) return group;

      // Chance that it's not on the secondary yet...
      return Group.findById(groupId, SELECT_FIELDS, { lean: true })
        .exec();
    });
}

function checkForAvatarUpdate(groupId, group, githubUsername) {
  groupId = mongoUtils.asObjectID(groupId);

  // No need to check github if we manage the URL ourselves
  if (group.avatarUrl) return;

  if (!group.avatarVersion ||
      !group.avatarCheckedDate ||
      (group.avatarCheckedDate - Date.now()) > AVATAR_VERSION_CHECK_TIMEOUT) {

    debug('Attempting to fetch group avatar for groupId=%s for github user=%s', groupId, githubUsername);
    return groupAvatarUpdater(groupId, githubUsername)
      .catch(function(err) {
        errorReporter(err, {
          groupId: groupId,
          githubUsername: githubUsername
        }, { module: 'group-avatar' });
      })
  }
}

function getAvatarUrlForGroupId(groupId, size) {
  return findOnSecondaryOrPrimary(groupId)
    .then(function(group) {
      if (!group) return null;

      // Use the custom URL if we have one
      var avatarUrl;
      if (group.avatarUrl) {
        avatarUrl = getAvatarUrlForSize(group.avatarUrl, size);

        // Tack on a version param otherwise the S3 url is always the same and
        // you always get the cached avatar from nginx's cache.
        if (group.avatarVersion) {
          return avatarUrl + '?v=' + group.avatarVersion;
        } else {
          return avatarUrl;
        }
      }

      // Use the Security Descriptor to
      // generate an avatar
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
      checkForAvatarUpdate(groupId, group, githubUsername);

      avatarUrl = 'https://avatars.githubusercontent.com/' + githubUsername + '?s=' + size;

      if (group.avatarVersion) {
        avatarUrl = avatarUrl + '&v=' + group.avatarVersion;

        return avatarUrl;
      } else {
        return avatarUrl;
      }
    });
}

module.exports = {
  getAvatarUrlForGroupId: getAvatarUrlForGroupId
}
