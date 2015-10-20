'use strict';

var targetEnv = require('targetenv');
var urlParser = require('../urls/url-parser');
var resolveAvatarUrl = require('./resolve-avatar-url');

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

module.exports = function getUserAvatarForSize(user, size) {
  // NOTE: user could just be a serialised partial bit of json too

  var size = (size || 30) * getPixelDensity();

  if (user) {
    if (user.gravatarImageUrl) {
      // prefer the full avatar URL if present
      return sizeUrlForAvatarUrl(user.gravatarImageUrl, size);

    } else if (user.username) {
      // fall back to the github optimised method
      var spec = {username: user.username, size: size};

      if (user.gravatarVersion) {
        spec.version = user.gravatarVersion;

      } else if (user.gv) {
        spec.version = user.gv;
      }

      return resolveAvatarUrl(spec);
    }
  }

  // return the default
  return "https://avatars1.githubusercontent.com/u/0";
};
