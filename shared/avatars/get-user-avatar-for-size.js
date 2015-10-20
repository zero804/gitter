'use strict';

var targetEnv = require('targetenv');
var urlParser = require('../urls/url-parser');
var resolveAvatarUrl = require('./resolve-avatar-url');
var _ = require('underscore');

// So when we prerender we get 1, if not then the real thing? Won't that
// potentially be weird? Rather just return 2x, 3x or 4x always? - 1x screens
// are increasingly rare and these are tiny tiny thumbnails anyway..
// Also: putting it in the file duplicates it..
var getPixelDensity = targetEnv.isBrowser ?
  function() { return window.devicePixelRatio || 1; } :
  function() { return 1; };

function getAliasForSizeFromHostname(hostname) {
  // This might have to get more granular than just per-hostname in future if
  // they go through different versioning schemes. It also might be a path
  // component rather than a query string parameter. Will rethink once we get
  // there.

  if (hostname.indexOf('google') === -1) {
    return 'sw';
  }

  // github uses s and we assume that's a good default
  return 's';
}

function sizeUrlForAvatarUrl(url, size) {
  var parsed = urlParser.parse(url, true);
  parsed.query[getAliasForSizeFromHostname(parsed.hostname)] = size;
  return urlParser.format(parsed);
}

function safeGet(obj, key) {
  // normal object
  if (obj[key] !== undefined) {
    return obj[key];
  }
  // backbone model
  if (obj.get) {
    return obj.get(key);
  }
}


var AVATAR_KEYS = [
  'gravatarImageUrl', // what's in the db, also the ideal
  'avatar_url', // returned by github, some strategies
  'avatarUrl', // some backbone models or marionette serializeData()
  'avatarUrlSmall', // some strategies (deprecated?)
  'avatarUrlMedium', // some strategies (deprecated?)
];

module.exports = function getUserAvatarForSize(user, size) {
  // NOTE: user could just be a serialised partial bit of json or a backbone model too

  size = (size || 60) * getPixelDensity();

  if (user) {
    var key = _.find(AVATAR_KEYS, function(key) {
      return safeGet(user, key) !== undefined;
    });

    if (key) {
      // prefer a full avatar URL if present
      return sizeUrlForAvatarUrl(safeGet(user, key), size);

    } else {
      var username = safeGet(user, 'username');
      if (username) {
        // fall back to the github optimised method
        var spec = {username: username, size: size};

        var gravatarVersion = safeGet(user, 'gravatarVersion');
        var gv = safeGet(user, 'gv');
        if (gravatarVersion) {
          spec.version = gravatarVersion;

        } else if (gv) {
          spec.version = gv;
        }

        return resolveAvatarUrl(spec);
      }
    }
  }

  // return the default
  return "https://avatars1.githubusercontent.com/u/0";
};
