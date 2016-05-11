'use strict';

var url = require('url');

/* Given a avatar url, get the cache buster */
module.exports = function extractGravatarVersion(avatarUrl) {
  try {
    var parsed = url.parse(avatarUrl, true, true);
    if (parsed.hostname == 'avatars.githubusercontent.com') {
      return parsed.query.v || undefined;
    }
  } catch(e) {
    /* */
  }
};
