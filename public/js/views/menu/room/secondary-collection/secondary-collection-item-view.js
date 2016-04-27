'use strict';

var _                       = require('underscore');
var roomNameShortener       = require('gitter-web-shared/room-name-shortener');
var BaseCollectionItemView  = require('../base-collection/base-collection-item-view');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');
var parseForTemplate        = require('gitter-web-shared/parse/left-menu-primary-item');

module.exports = BaseCollectionItemView.extend({

  serializeData: function() {
    var data = parseForTemplate(this.model.toJSON(), this.roomMenuModel.get('state'));
    return data;
  }
});
