'use strict';

var _                       = require('underscore');
var roomNameShortener       = require('gitter-web-shared/room-name-shortener');
var BaseCollectionItemView  = require('../base-collection/base-collection-item-view');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');
var parseForTemplate        = require('gitter-web-shared/parse/left-menu-primary-item');
var parseRoomItemName       = require('gitter-web-shared/get-org-menu-state-name-from-troupe-name');
var roomNameShortener       = require('gitter-web-shared/room-name-shortener');

module.exports = BaseCollectionItemView.extend({

  initialize: function() {
    BaseCollectionItemView.prototype.initialize.apply(this, arguments);
    this.listenTo(this.roomMenuModel, 'change:state:post', this.onMenuChangeState, this);
  },

  serializeData: function() {
    var data = parseForTemplate(this.model.toJSON(), this.roomMenuModel.get('state'));
    return data;
  },

  onMenuChangeState: function () {
    var name    = (this.model.get('name') || this.model.get('uri'));
    var content = (this.roomMenuModel.get('state') === 'org') ?
      parseRoomItemName(name) :
      roomNameShortener(name);
    this.ui.title.text(content);
  },
});
