'use strict';

var avatars = require('gitter-web-avatars');

function getAvatarUrlForUriContext(uriContext) {
  var troupe = uriContext.troupe;

  if (troupe.oneToOne) {
    return avatars.getForUser(uriContext.oneToOneUser);
  } else {
    return avatars.getForRoomUri(uriContext.uri);
  }
}

module.exports = getAvatarUrlForUriContext;
