'use strict';

var _ = require('underscore');
var hash = require('./hash-avatar-to-cdn');
var urlParser = require('../urls/url-parser');

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

function joinUrl(opts) {
  // urlParser.format adds the port number from the current page when running
  // in the browser
  var pairs = _.map(opts.query || {}, function(v, k) {
    return k+'='+v;
  });
  var query = pairs.join('&');
  return opts.protocol+'//'+opts.hostname+opts.pathname+'?'+query;
}

function srcSetForUser(user, size) {
  // required: user.gravatarImageUrl
  // optional: user.username (for github round-robin)

  // NOTE: url parsing will only happen server-side because client-side the
  // browser will just use avatarUrlSmall without going through this again.
  var parsed = urlParser.parse(user.gravatarImageUrl, true);

  // try and do the same hashing to pull from different subdomains
  if (parsed.hostname.indexOf('github') !== -1 && user.username) {
    parsed.hostname = 'avatars' + hash(user.username) + '.githubusercontent.com';
  }

  var attr = getAliasForSizeFromHostname(parsed.hostname);

  parsed.query[attr] = size;
  var src = joinUrl(parsed);

  parsed.query[attr] = size*2;
  var srcset = joinUrl(parsed) + ' 2x';

  return {
    src: src,
    size: size,
    srcset: srcset
  };
}

function buildAvatarUrlForUsername(username, version, size) {
  // This is the old fallback method that just sticks a username in there.

  if (username.indexOf('_') === -1) {
    // github namespace
    return 'https://avatars' + hash(username) + '.githubusercontent.com/' + username + '?' + (version ? 'v=' + version : '') + '&s=' + size;
  } else {
    // not github, send to resolver
    return '/api/private/user-avatar/'+username+'?s='+size;
  }
}

module.exports = function resolveUserAvatarSrcSet(user, size) {
  // NOTE: user could just be a serialised partial bit of json

  size = size || 60;

  if (user.avatarUrlSmall) {
    // Don't recalculate it if we already have it. The problem this poses is
    // that avatarUrlSmall is just a single value, not srcset, so we gotta
    // hack it a bit.
    return {
      src: user.avatarUrlSmall.replace('=60', '='+size),
      size: size,
      srcset: user.avatarUrlSmall.replace('=60', '='+(size*2))+' 2x'
    };

  } else if (user.gravatarImageUrl) {
    // straight outta the db, so figure out what parameter to add
    return srcSetForUser(user, size);

  } else if (user.username) {
    // fall back to the username method
    var version = user.gravatarVersion || user.gv; // or undefined
    return {
      src: buildAvatarUrlForUsername(user.username, version, size),
      size: size,
      srcset: buildAvatarUrlForUsername(user.username, version, size*2) + ' 2x'
    };

  }

  // default: best we can do
  return {
    src: DEFAULT_AVATAR_URL + '?s=' + size,
    size: size,
    srcset: DEFAULT_AVATAR_URL + '?s=' + (size*2) + ' 2x'
  };
};

