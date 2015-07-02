/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var appEvents   = require('gitter-web-appevents');
var roomService = require('../services/room-service');

exports.install = function() {
  appEvents.onRepoPermissionsChangeDetected(function(data) {
    var uri = data.uri;
    var isPrivate = data.isPrivate;

    if(isPrivate) {
      roomService.ensureRepoRoomSecurity(uri, 'PRIVATE');
    } else {
      roomService.ensureRepoRoomSecurity(uri, 'PUBLIC');
    }
  });
};