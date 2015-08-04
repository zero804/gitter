/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var EVENT_LISTENERS = [
  './bayeux-events-bridge',
  './room-permissions-change-listener',
  './repo-rename-detected-listener',
  './notification-event-listener',
  './live-collection-events-listener',
  './room-membership-events'
];

var installed = false;

exports.install = function() {
  if (installed) return;

  EVENT_LISTENERS.forEach(function(module) {
    require(module).install();
  });
};
