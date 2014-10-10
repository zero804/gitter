/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

function getOwnerAvatarUrl(suggestedRoom) {
  return 'https://avatars.githubusercontent.com/' + suggestedRoom.uri.split('/')[0] + '?';
}

function SuggestedRoomStrategy() {

  this.preload = function(x, callback) {
    callback();
  };

  this.map = function(suggestedRoom) {
    return {
      uri: suggestedRoom.uri,
      githubType: suggestedRoom.githubType,
      avatarUrl: getOwnerAvatarUrl(suggestedRoom),
      exists: !!suggestedRoom.room,
      userCount: suggestedRoom.room && suggestedRoom.room.users.length,
      description: suggestedRoom.room && suggestedRoom.room.topic || suggestedRoom.repo && suggestedRoom.repo.description
    };
  };
}

SuggestedRoomStrategy.prototype = {
  name: 'SuggestedRoomStrategy'
};

module.exports = SuggestedRoomStrategy;
