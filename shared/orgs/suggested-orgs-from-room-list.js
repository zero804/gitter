'use strict';
var _ = require('lodash');

module.exports = function suggestedOrgsFromRoomList(roomList){
  return roomList.reduce(function(memo, room){
    if(room.githubType === 'ONETOONE') return memo;
    var orgName = room.name.split('/')[0];
    if(!!_.where(memo, { name: orgName }).length) return memo;
    memo.push({ name: orgName });
    return memo;
  }, []);
};
