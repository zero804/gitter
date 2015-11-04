'use strict';

var _ = require('underscore');
var hash = require('./hash-avatar-to-cdn');
var targetEnv = require('targetenv');
var DEFAULT_AVATAR_URL = 'https://avatars1.githubusercontent.com/u/0';

function parseUrl(urlStr, parseQueryString, slashesDenoteHost) {
  if (targetEnv.isBrowser) {
    var parsed = parse(urlStr);
    parsed.query = parseSearch(parsed.search);
    return parsed;

  } else {
    var url = require('url');
    return url.parse(urlStr, parseQueryString, slashesDenoteHost);
  }

  function parse(url) {
    var parser = document.createElement('a');
    parser.href = url;

    return {
      protocol: parser.protocol,
      hostname: parser.hostname,
      port: parser.port,
      pathname: parser.pathname,
      search: parser.search,
      hash: parser.hash,
      host: parser.host,
      href: parser.href
    };
  }

  function decodePart(s) {
    return decodeURIComponent(s.replace(/\+/g, " "));
  }

  function parseSearch(search) {
    var result = {};

    if (!search) return result;
    var query = search.substring(1);

    var match;
    var re = /([^&=]+)=?([^&]*)/g;

    while ((match = re.exec(query))) {
      result[decodePart(match[1])] = decodePart(match[2]);
    }

    return result;
  }
}

function formatUrl(opts) {
  // urlParser.format adds the port number from the current page when running
  // in the browser
  var pairs = _.map(opts.query || {}, function(v, k) {
    return k+'='+v;
  });
  var query = pairs.join('&');
  return opts.protocol+'//'+opts.hostname+opts.pathname+'?'+query;
}

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

function srcSetForUser(user, size) {
  // required: user.gravatarImageUrl
  // optional: user.username (for github round-robin)

  // NOTE: url parsing should only happen server-side because client-side the
  // browser will just use avatarUrlSmall (if it is set by the serializer
  // strategy) without going through this again.
  var parsed = parseUrl(user.gravatarImageUrl, true);

  // try and do the same hashing to pull from different subdomains
  if (parsed.hostname.indexOf('github') !== -1 && user.username) {
    parsed.hostname = 'avatars' + hash(user.username) + '.githubusercontent.com';
  }

  var attr = getAliasForSizeFromHostname(parsed.hostname);

  var srcSize = size;
  if (typeof window !== 'undefined') {
    // fallback for retina displays without srcset support (e.g native android webviews)
    srcSize = size * (window.devicePixelRatio || 1);
  }

  parsed.query[attr] = srcSize;
  var src = formatUrl(parsed);

  parsed.query[attr] = size*2;
  var srcset = formatUrl(parsed) + ' 2x';


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

