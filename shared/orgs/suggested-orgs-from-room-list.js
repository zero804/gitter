'use strict';
var _ = require('lodash');
var getRoomAvatar = require('../../public/js/utils/get-room-avatar');

module.exports = function suggestedOrgsFromRoomList(roomList){
  return roomList.reduce(function(memo, room){
    //remove on-to-one conversations
    if(room.githubType === 'ONETOONE') { return memo }

    //clean the prepending / from the url
    room.url = (room.url || '');
    var url  = room.url.substring(1);

    //get the first part of the url ie gitterHQ/gitter === gitterHQ
    var orgName = url.split('/')[0];

    //check its unique
    if(!!_.where(memo, { name: orgName }).length) return memo;
    memo.push({ name: orgName, imgUrl: getRoomAvatar(orgName), id: orgName });
    return memo;
  }, []);
};
