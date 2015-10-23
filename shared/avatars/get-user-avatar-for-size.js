'use strict';

var targetEnv = require('targetenv');
var urlParser = require('../urls/url-parser');
var resolveAvatarUrl = require('./resolve-avatar-url');
var _ = require('underscore');

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

function sizeUrlForAvatarUrl(url, size) {
  // NOTE: This will only happen server-side because the client will just use
  // avatarUrlSmall without going through this again.
  var parsed = urlParser.parse(url, true);

  // delete these otherwise urlParser.format() wll not use parsed.query
  delete parsed.href;
  delete parsed.search;

  parsed.query[getAliasForSizeFromHostname(parsed.hostname)] = size;

  return urlParser.format(parsed);
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
      return sizeUrlForAvatarUrl(user.gravatarImageUrl, size);

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

      return resolveAvatarUrl(spec);
    }
  }

  // return the default
  return "https://avatars1.githubusercontent.com/u/0";
};
