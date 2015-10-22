'use strict';

var _ = require('underscore');
var template = require('./compile-web-template')('/js/views/menu/tmpl/room-list-item');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');

module.exports = function (model) {
  var data = _.extend(model, {
    roomAvatarSrcSet: resolveRoomAvatarSrcSet(model.url, 16)
  });
  return template(data);
};
