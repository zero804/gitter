'use strict';
var ensurePojo = require('./ensure-pojo');

// @const
var PREFIX = 'room-list-item__name--';

module.exports = function (room) {
  room = ensurePojo(room);
  var iconName = room.githubType.toLowerCase();

  // repo_channel, user_channel etc
  if (iconName.indexOf('channel') >= 0) {
    iconName = 'channel';
  }

  if (room.favourite) {
    iconName = 'favourite';
  }

  return PREFIX + iconName;
};
