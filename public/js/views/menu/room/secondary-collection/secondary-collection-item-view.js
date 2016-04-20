'use strict';

var _                       = require('underscore');
var roomNameShortener       = require('gitter-web-shared/room-name-shortener');
var BaseCollectionItemView  = require('../base-collection/base-collection-item-view');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');

module.exports = BaseCollectionItemView.extend({

  serializeData: function() {
    var data = BaseCollectionItemView.prototype.serializeData.apply(this, arguments);

    if (data.fromUser) {
      return _.extend({}, data, {
        name: data.text,
        avatarUrl: data.fromUser.avatarUrlSmall,
      });
    }

    var name = (data.name || data.uri);
    return _.extend({}, data, {
      name:         roomNameShortener(name),
      avatarSrcset: resolveRoomAvatarSrcSet({ uri: data.uri }, 22)
    });
  }
});
