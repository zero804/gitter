'use strict';

var _                       = require('lodash');
var template                = require('./compile-web-template')('/js/views/menu/old/tmpl/org-list-item');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');
var prerenderWrapper        = require('./prerender-wrapper');

module.exports = function (model) {
  var data = _.extend(model, {
    roomAvatarSrcSet: resolveRoomAvatarSrcSet({ uri: model.name}, 16)
  });

  var inner = template(data);

  return prerenderWrapper({
    inner: inner,
    wrap: "li",
    dataId: model.id,
    className: "room-list-item"
  });
};
