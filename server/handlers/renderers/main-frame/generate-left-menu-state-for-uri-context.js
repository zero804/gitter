"use strict";

var Promise = require('bluebird');
var userSettingsService = require('../../../services/user-settings-service');

function calculate(uriContext, options) {
  var currentRoom = uriContext && uriContext.troupe;
  var currentGroup = uriContext && uriContext.group;
  var roomMember = uriContext && uriContext.roomMember;

  var suggestedMenuState = options.suggestedMenuState;
  var hasDismissedSuggestions = options.hasDismissedSuggestions;
  var suggestedRoomsHidden = options.suggestedRoomsHidden;
  var roomMenuIsPinned = options.roomMenuIsPinned === undefined ?
                          true : options.roomMenuIsPinned;

  var menuState;
  var groupId;

  if (suggestedMenuState) {
    menuState = suggestedMenuState;
  } else if (currentRoom) {
    // But if we find something later, let's use it instead
    if(currentRoom.groupId && !roomMember) {
      menuState = 'org';
      groupId = currentRoom.groupId;
    } else {
      menuState = 'all'
    }
  } else if (currentGroup) {
    menuState = 'org';
    groupId = currentGroup._id;
  } else {
    menuState = 'all'
  }


  return {
    state: menuState,
    groupId: groupId,
    hasDismissedSuggestions: hasDismissedSuggestions,
    suggestedRoomsHidden: suggestedRoomsHidden,
    roomMenuIsPinned: roomMenuIsPinned,
  };
}

function getSettingsForUser(userId) {
  if (!userId) return Promise.resolve(null);

  return userSettingsService.getMultiUserSettingsForUserId(userId, ['suggestedRoomsHidden', 'leftRoomMenu']);
}

function generateLeftMenuStateForUriContext(userId, uriContext, suggestedMenuState) {
  return getSettingsForUser(userId)
    .then(function(settings) {
      var suggestedRoomsHidden = settings && settings.suggestedRoomsHidden;
      var leftRoomMenuState = settings && settings.leftRoomMenu;

      return calculate(uriContext, {
        suggestedMenuState: suggestedMenuState,
        suggestedRoomsHidden: suggestedRoomsHidden,
        hasDismissedSuggestions: leftRoomMenuState && leftRoomMenuState.hasDismissedSuggestions,
        roomMenuIsPinned: leftRoomMenuState && leftRoomMenuState.roomMenuIsPinned
      });

    });
}


module.exports = generateLeftMenuStateForUriContext;
