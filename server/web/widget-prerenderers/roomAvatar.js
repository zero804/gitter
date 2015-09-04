/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var resolveRoomAvatarUrl = require('gitter-web-shared/avatars/resolve-room-avatar-url');

module.exports = exports = function(template) {
  return function avatarWidgetHandler(params) {
    var hash = params.hash;
    var user = hash.model || hash.user || {};

    var r = template({ });
    console.log('RRR', r);
    return r;
  };
};
