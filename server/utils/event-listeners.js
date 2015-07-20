/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var installed = false;

exports.installLocalEventListeners = function() {
  if(!installed) {
    require('../web/bayeux-events-bridge').install();
    require('../services/notifications/notification-generator-service').install();
    require('../event-listeners/').install();

    require('../services/live-collections').install();
    require('../services/room-membership-events').install();

    installed = true;
  }
};
