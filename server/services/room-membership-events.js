'use strict';

/**
 * Bridges events from the membership service up to the live-collections
 */
var env                   = require('gitter-web-env');
var stats                 = env.stats;
var logger                = env.logger;
var roomMembershipService = require('./room-membership-service');
var liveCollections       = require('./live-collections');

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
  });

  liveCollections.roomMembers.emit('lurkChange', troupeId, userIds, lurk);
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
