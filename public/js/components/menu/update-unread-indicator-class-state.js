'use strict';

var toggleClass = require('../../utils/toggle-class');

var UNREAD_INDICATOR_STATE_CLASSES = {
  unreads: 'has-unreads',
  mentions: 'has-mentions',
  activity: 'has-activity'
};

var updateUnreadIndicatorClassState = function(roomModel, indicatorElements) {
  var stateClassKey = null;

  if(roomModel.get('mentions') > 0) {
    stateClassKey = 'mentions';
  }
  else if(roomModel.get('unreadItems') > 0) {
    stateClassKey = 'unreads';
  }
  else if(roomModel.get('activity') > 0) {
    stateClassKey = 'activity';
  }

  // Clear out the state classes (we only like one at a time, OR'ed)
  // And only set the state class that matches
  Object.keys(UNREAD_INDICATOR_STATE_CLASSES).forEach(function(key) {
    Array.prototype.forEach.call(indicatorElements, function(indicatorElement) {
      toggleClass(indicatorElement, UNREAD_INDICATOR_STATE_CLASSES[key], stateClassKey === key);
    });
  });

  return stateClassKey;
};

updateUnreadIndicatorClassState.UNREAD_INDICATOR_STATE_CLASSES = UNREAD_INDICATOR_STATE_CLASSES;



module.exports = updateUnreadIndicatorClassState;
