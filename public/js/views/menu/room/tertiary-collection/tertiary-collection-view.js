'use strict';

var _                       = require('underscore');
var Marionette              = require('backbone.marionette');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');
var BaseCollectionView      = require('../base-collection/base-collection-view');
var BaseCollectionItemView  = require('../base-collection/base-collection-item-view');
var roomNameShortener       = require('gitter-web-shared/room-name-shortener');
var EmptySearchView         = require('./tertiary-collection-item-search-empty-view');
var toggleClass             = require('utils/toggle-class');

var proto = BaseCollectionView.prototype;

var ItemView = BaseCollectionItemView.extend({
  serializeData: function() {
    var data = this.model.toJSON();
    var name = (data.name || data.uri || '');
    return _.extend({}, data, {
      name:         roomNameShortener(name),
      avatarSrcset: (!data.isRecentSearch) ? resolveRoomAvatarSrcSet({ uri: name }, 22) : null,
    });
  },
});

module.exports =  BaseCollectionView.extend({
  childView:          ItemView,
  className:          'tertiary-collection',

  ui :{
    header: '#collection-header'
  },

  initialize: function(attrs) {
    this.roomMenuModel       = attrs.roomMenuModel;
    this.roomCollection      = attrs.roomCollection;
    this.primaryCollection   = attrs.primaryCollection;
    this.secondaryCollection = attrs.secondaryCollection;

    this.listenTo(this.roomMenuModel, 'change:searchTerm', this.setActive, this);
    this.listenTo(this.collection, 'filter-complete sync', this.render, this);

    BaseCollectionView.prototype.initialize.apply(this, arguments);
  },

  getEmptyView: function(){
    switch(this.roomMenuModel.get('state')) {
      case 'search':
        return EmptySearchView;
      default:
        return Marionette.ItemView.extend({ template: false });
    }
  },

  filter: function (model, index){
    switch(this.roomMenuModel.get('state')) {
      case 'search':
        return (index <= 5);
      default:
        return  !this.primaryCollection.get(model.get('id')) &&
                !this.secondaryCollection.get(model.get('id'));
    }
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
      return this._openCreateRoomDialog(view.model);
    }

    proto.onItemClicked.apply(this, arguments);
  },

  onSearchItemClicked: function(view) {
    this.roomMenuModel.set('searchTerm', view.model.get('name'));
    this.bus.trigger('left-menu:recent-search', view.model.get('name'));
  },

  onRender: function (){
    BaseCollectionView.prototype.onRender.apply(this, arguments);
    if(this.ui.header && this.ui.header[0]) {
      toggleClass(
        this.ui.header[0],
        'hidden',
        (this.isEmpty() && (this.roomMenuModel.get('state') === 'search'))
      );
    }
  },

  onDestroy: function() {
    this.stopListening();
  },

});
