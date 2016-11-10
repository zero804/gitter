"use strict";

function generateLeftMenuStateForUriContext(uriContext, leftMenuPeristedState, options) {
  var currentRoom = uriContext && uriContext.troupe;
  var currentGroup = uriContext && uriContext.group;
  var roomMember = uriContext && uriContext.roomMember;

  var menuState;
  var groupId;

  if (options.suggestedMenuState) {
    menuState = options.suggestedMenuState;
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

  var roomMenuIsPinned = true;
  if(leftMenuPeristedState && leftMenuPeristedState.roomMenuIsPinned !== undefined) {
    roomMenuIsPinned = leftMenuPeristedState.roomMenuIsPinned;
  }

  return {
    state: menuState,
    groupId: groupId,
    hasDismissedSuggestions: leftMenuPeristedState && leftMenuPeristedState.hasDismissedSuggestions,
    roomMenuIsPinned: roomMenuIsPinned,
  };
}

module.exports = generateLeftMenuStateForUriContext;
