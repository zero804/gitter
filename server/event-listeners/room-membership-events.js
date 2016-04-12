'use strict';

/**
 * Bridges events from the membership service up to the live-collections
 */

var env                   = require('gitter-web-env');
var stats                 = env.stats;
var errorReporter         = env.errorReporter;
var roomMembershipService = require('../services/room-membership-service');
var liveCollections       = require('../services/live-collections');
var unreadItemService     = require('../services/unread-items');

function onMembersAdded(troupeId, userIds) {
  liveCollections.roomMembers.emit('added', troupeId, userIds);
}

function onMembersRemoved(troupeId, userIds) {
  liveCollections.roomMembers.emit('removed', troupeId, userIds);
}

function onMembersLurkChange(troupeId, userIds, lurk) {
  userIds.forEach(function(userId) {
    stats.event("lurk_room", {
      userId: '' + userId,
      troupeId: '' + troupeId,
      lurking: lurk
    });

    if (lurk) {
      unreadItemService.ensureAllItemsRead(userId, troupeId)
        .catch(function(err) {
          errorReporter(err, { unreadItemsFailed: true }, { module: 'room-membership-events' });
        })
        .done();
    }
  });

  liveCollections.roomMembers.emit('lurkChange', troupeId, userIds, lurk);
  return null;
}

var installed = false;
exports.install = function() {
  if (installed) return;
  installed = true;

  var events = roomMembershipService.events;

  events.on("members.added", onMembersAdded);

  events.on("members.removed", onMembersRemoved);

  events.on("members.lurk.change", onMembersLurkChange);
};

exports.testOnly = {
  onMembersAdded: onMembersAdded,
  onMembersRemoved: onMembersRemoved,
  onMembersLurkChange: onMembersLurkChange
};
