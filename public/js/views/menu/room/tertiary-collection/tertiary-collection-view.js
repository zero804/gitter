'use strict';

var Marionette         = require('backbone.marionette');
var _                  = require('underscore');
var itemTemplate       = require('./tertiary-collection-item-view.hbs');
var getRoomAvatar      = require('utils/get-room-avatar');
var BaseCollectionView = require('../base-collection/base-collection-view');

var ItemView = Marionette.ItemView.extend({
  template: itemTemplate,
  initialize: function(attrs) {
    this.roomMenuModel = attrs.roomMenuModel;
  },
  serializeData: function() {
    var data = this.model.toJSON();
    var avatarURL = (this.roomMenuModel.get('state') === 'search') ? null : getRoomAvatar(data.name || ' ');
    return _.extend({}, data, {
      avatarUrl: avatarURL
    });
  },
});

module.exports =  BaseCollectionView.extend({
  childView:          ItemView,
  className:          'tertiary-collection',
  childViewOptions: function (model){
    return { model: model, roomMenuModel: this.roomMenuModel };
  },

  initialize: function(attrs) {
    this.roomMenuModel = attrs.roomMenuModel;
    this.listenTo(this.roomMenuModel, 'change:searchTerm', this.onSearchUpdate, this);
  },

  filter: function (model, index){ //jshint unused: true
    return (index <= 10);
  },

  onSearchUpdate: function (){
    if(this.roomMenuModel.get('state') !== 'search') { return  }
    this.$el.toggleClass('active', !this.roomMenuModel.get('searchTerm'));
  },

  onDestroy: function (){
    this.stopListening(this.roomMenuModel);
  },
});
