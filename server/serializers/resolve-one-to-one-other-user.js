'use strict';

var debug = require('debug')('gitter:infra:serializer:resolve-one-to-one-other-user');

function mapOtherUser(currentUserId, users) {
  var otherUser = users.filter(function(troupeUser) {
    return '' + troupeUser.userId !== '' + currentUserId;
  })[0];

  return otherUser;
}

function resolveOneToOneOtherUser(item, currentUserId) {
  if (!item.oneToOne) {
    return null;
  }

  if (!currentUserId) {
    debug('TroupeStrategy initiated without currentUserId, but generating oneToOne troupes. This can be a problem!');
    return null;
  }

  var otherUser = mapOtherUser(currentUserId, item.oneToOneUsers);

  if (!otherUser) {
    debug("Troupe %s appears to contain bad users", item._id);
    return null;
  }

  return otherUser;
}


module.exports = resolveOneToOneOtherUser;
