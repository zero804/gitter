'use strict';
var ensurePojo = require('./ensure-pojo');

module.exports = function (room) {
  room = ensurePojo(room);
  var iconName = room.githubType && room.githubType.toLowerCase();

  // repo_channel, user_channel etc
  if (iconName && iconName.indexOf('channel') >= 0) {
    iconName = 'hash';
  }

  if (iconName && iconName.indexOf('onetoone') >= 0) {
    iconName = 'mention';
  }

  if (iconName === 'org') {
    iconName = 'organization';
  }

  if (room.favourite) {
    iconName = 'star-1';
  }

  return iconName;
};
