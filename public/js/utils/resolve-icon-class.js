'use strict';
var ensurePojo = require('./ensure-pojo');

module.exports = function (room) {
  room = ensurePojo(room);
  var iconName = room.githubType && room.githubType.toLowerCase();


  // repo_channel, user_channel etc
  if (iconName && iconName.indexOf('channel') > -1) {
    iconName = 'icon-hash';
  }

  if (iconName && iconName.indexOf('onetoone') > -1) {
    iconName = 'icon-at';
  }

  if (iconName && iconName.indexOf('repo') > -1) {
    iconName = 'octicon octicon-repo';
  }

  if (iconName && iconName.indexOf('org') > -1) {
    iconName = 'octicon octicon-organization';
  }

  if (room.favourite) {
    iconName = 'icon-star-1';
  }

  return iconName;
};
