'use strict';
var _                       = require('lodash');
var resolveRoomAvatarSrcSet = require('../avatars/resolve-room-avatar-srcset.js');

module.exports = function suggestedOrgsFromRoomList(roomList) {
  return roomList.reduce(function(memo, room) {
    //remove on-to-one conversations
    if (room.githubType === 'ONETOONE') { return memo; }

    //clean the prepending / from the url
    room.url = (room.url || '');
    var url  = room.url.substring(1);

    //get the first part of the url ie gitterHQ/gitter === gitterHQ
    var orgName = url.split('/')[0];

    //check its unique
    var existingEntry = _.where(memo, { name: orgName })[0];
    if (!!existingEntry) {
      var index = memo.indexOf(existingEntry);
      memo[index].unreadItems = ((existingEntry.unreadItems || 0) + (room.unreadItems || 0));
      memo[index].mentions    = ((existingEntry.mentions || 0) + (room.mentions || 0));
      memo[index].activity    = (!!memo[index].activity || (room.lurk && room.activity));
      return memo;
    }

    memo.push({
      name:        orgName,
      imgUrl:      resolveRoomAvatarSrcSet({ uri: orgName }, 22),
      id:          orgName,
      unreadItems: (room.unreadItems || 0),
      mentions:    (room.mentions || 0),
      activity:    (!!room.lurk && room.activity)
    });
    return memo;
  }, []);
};
