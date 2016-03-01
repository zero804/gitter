'use strict';

var _                 = require('underscore');
var roomNameShortener = require('gitter-web-shared/room-name-shortener');
var getRoomAvatar     = require('gitter-web-shared/avatars/get-room-avatar');
var BaseCollectionItemView = require('../base-collection/base-collection-item-view');

module.exports = BaseCollectionItemView.extend({
  serializeData: function() {
    var data = this.model.toJSON();

    if (data.fromUser) {
      return _.extend({}, data, {
        name: data.text,
        avatarUrl: data.fromUser.avatarUrlSmall,
      });
    }

    //When recent searches are rendered the models have an avatarUrl of null,
    //this is because we want to hide the avatar image ONLY in this case
    //as such we have this check here jp 25/1/16
    if (data.avatarUrl !== null) {
      data.avatarUrl = (data.avatarUrl || getRoomAvatar(data.name || data.uri || ' '));
    }

    return _.extend({}, data, {
      name: roomNameShortener((data.name || data.uri)),
    });
  }
});
