'use strict';

var _ = require('underscore');

/*
Some context: It is possible for a non-github user to follow a link to a public
room that doesn't allow non-github users to join. In that case the frontend
must know to not allow the user to join and the backend/API must prevent that
from happening.
*/
function userCanJoinRoom(userProviders, disabledProviders) {
  // To be safe, we assume the user has no identity which is non-sensical, but
  // safer than picking one as that will mask bugs.
  userProviders = userProviders || [];

  // By default all providers are allowed
  disabledProviders = disabledProviders || [];

  // If the user has at least one provider that's not disabled, then she can
  // join the room.
  return _.difference(userProviders, disabledProviders).length > 0;
}
module.exports = userCanJoinRoom;
