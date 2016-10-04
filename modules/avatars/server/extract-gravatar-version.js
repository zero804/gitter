'use strict';

var url = require('url');

/* Given a avatar url, get the cache buster */
module.exports = function extractGravatarVersion(avatarUrl) {
  try {
    var parsed = url.parse(avatarUrl, true, true);
    if (parsed.hostname === 'avatars.githubusercontent.com') {
      return parseInt(parsed.query.v, 10) || undefined;
    }
  } catch(e) {
    /* */
  }
};
