'use strict';

var targetEnv = require('targetenv');
var urlParser = require('../urls/url-parser');
var _ = require('underscore');
var djb2Hash = require('../djb2-hash');

var DEFAULT_AVATAR_URL = 'https://avatars1.githubusercontent.com/u/0';

function getAliasForSizeFromHostname(hostname) {
  // This might have to get more granular than just per-hostname in future if
  // they go through different versioning schemes. It also might be a path
  // component rather than a query string parameter. Will rethink once we get
  // there.

  if (hostname.indexOf('google') !== -1) {
    return 'sw';
  }

  // github uses s and we assume that's a good default
  return 's';
}

function sizeUrlForAvatarUrl(url, size, username) {
  // username is optional and only useful for the github optimisation below

  // NOTE: This will only happen server-side because the client will just use
  // avatarUrlSmall without going through this again.
  var parsed = urlParser.parse(url, true);

  // delete these otherwise urlParser.format() wll not use parsed.query
  delete parsed.href;
  delete parsed.search;

  parsed.query[getAliasForSizeFromHostname(parsed.hostname)] = size;

  // try and do the same hashing to pull from different subdomains
  if (parsed.hostname.indexOf('github') !== -1 && username) {
    parsed.hostname = 'avatars' + djb2Hash(username) + '.githubusercontent.com';
  }

  return urlParser.format(parsed);
}

function buildAvatarUrlForUsername(spec) {
  // This is the old fallback method that just sticks a username in there.

  var username = spec.username;
  var version = spec.version;
  var size = spec.size;

  if (username.indexOf('_') == -1) {
    // github namespace
    return 'https://avatars' + djb2Hash(username) + '.githubusercontent.com/' + username + '?' + (version ? 'v=' + version : '') + '&s=' + size;
  } else {
    // not github, send to resolver
    return '/api/private/user-avatar/'+username+'?s='+size;
  }
}

module.exports = function getUserAvatarForSize(user, size) {
  // NOTE: user could just be a serialised partial bit of json or a backbone model too

  size = size || 60;

  if (user) {
    var username = user.username;

    if (user.avatarUrlSmall) {
      // don't recalculate it if we already have it (already serialized)
      if (size == 128 && user.avatarUrlMedium) {
        return user.avatarUrlMedium;
      } else {
        return user.avatarUrlSmall;
      }

    } else if (user.gravatarImageUrl) {
      // straight outta the db, so figure out what parameter to add
      return sizeUrlForAvatarUrl(user.gravatarImageUrl, size, username);

    } else if (username) {
      // fall back to the username method
      var spec = {username: username, size: size};

      var gravatarVersion = user.gravatarVersion;
      var gv = user.gv;
      if (gravatarVersion) {
        spec.version = gravatarVersion;

      } else if (gv) {
        spec.version = gv;
      }

      return buildAvatarUrlForUsername(spec);
    }
  }

  // return the default
  return DEFAULT_AVATAR_URL;
};
