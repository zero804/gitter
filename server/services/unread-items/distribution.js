'use strict';

function Distribution(options) {
  this.notifyUserIds = options.notifyUserIds;
  this.mentionUserIds = options.mentionUserIds;
  this.activityOnlyUserIds = options.activityOnlyUserIds;
  this.notifyNewRoomUserIds = options.notifyNewRoomUserIds;
  this.announcement = options.announcement;
  this.presence = options.presence;
}

module.exports = Distribution;
