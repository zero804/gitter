'use strict';
var _ = require('lodash');
var getRoomAvatar = require('../../public/js/utils/get-room-avatar');

module.exports = function suggestedOrgsFromRoomList(roomList){
  return roomList.reduce(function(memo, room){
    if(room.githubType !== 'ORG') return memo;
    var orgName = room.name.split('/')[0];
    if(!!_.where(memo, { name: orgName }).length) return memo;
    memo.push({ name: orgName, imgUrl: getRoomAvatar(orgName) });
    return memo;
  }, []);
};
