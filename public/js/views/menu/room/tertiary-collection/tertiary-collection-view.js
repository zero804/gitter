'use strict';

var _                      = require('underscore');
var getRoomAvatar          = require('gitter-web-shared/avatars/get-room-avatar');
var BaseCollectionView     = require('../base-collection/base-collection-view');
var BaseCollectionItemView = require('../base-collection/base-collection-item-view');
var roomNameShortener      = require('gitter-web-shared/room-name-shortener');

var proto = BaseCollectionView.prototype;

var ItemView = BaseCollectionItemView.extend({
  serializeData: function() {
    var data = this.model.toJSON();
    var avatarURL = (this.roomMenuModel.get('state') === 'search') ? null : getRoomAvatar(data.name || data.uri  || ' ');
    data.name = roomNameShortener(data.name || data.uri);
    return _.extend({}, data, {
      avatarUrl: avatarURL,
    });
  },
});

module.exports =  BaseCollectionView.extend({
  childView:          ItemView,
  className:          'tertiary-collection',

  initialize: function(attrs) {
    this.roomMenuModel  = attrs.roomMenuModel;
    this.roomCollection = attrs.roomCollection;
    this.listenTo(this.roomMenuModel, 'change:searchTerm', this.setActive, this);
    this.listenTo(this.collection, 'filter-complete', this.render, this);
  },

  setActive: function() {
    switch (this.roomMenuModel.get('state')) {
      case 'search':
        return (!this.roomMenuModel.get('searchTerm')) ?
          proto.setActive.apply(this, arguments) :
          this.el.classList.remove('active');

      default:
        return !!this.collection.length ?
          proto.setActive.apply(this, arguments) :
          this.el.classList.remove('active');
    }
  },

  onItemClicked: function() {
    switch (this.roomMenuModel.get('state')) {
      case 'all':
        return this.onOrgItemClicked.apply(this, arguments);
      case 'search':
        return this.onSearchItemClicked.apply(this, arguments);
      default:
        return proto.onItemClicked.apply(this, arguments);
    }
  },

  onOrgItemClicked: function(view) {
    var existingRoom = this.roomCollection.findWhere({ name: view.model.get('name') });
    if (!existingRoom) {
      window.location.hash = '#confirm/' + view.model.get('name'); return;
    }

    proto.onItemClicked.apply(this, arguments);
  },

  onSearchItemClicked: function(view) {
    this.roomMenuModel.set('searchTerm', view.model.get('name'));
  },

  onDestroy: function() {
    this.stopListening();
  },

});
