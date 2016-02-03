'use strict';

var Marionette         = require('backbone.marionette');
var _                  = require('underscore');
var itemTemplate       = require('./tertiary-collection-item-view.hbs');
var getRoomAvatar      = require('utils/get-room-avatar');
var BaseCollectionView = require('../base-collection/base-collection-view');

var ItemView = Marionette.ItemView.extend({
  template: itemTemplate,
  initialize: function(attrs) {
    this.roomModel = attrs.roomModel;
  },
  serializeData: function() {
    var data = this.model.toJSON();
    var avatarURL = (this.roomModel.get('state') === 'search') ? null : getRoomAvatar(data.name || ' ');
    return _.extend({}, data, {
      avatarUrl: avatarURL
    });
  },
});

module.exports =  BaseCollectionView.extend({
  childView:          ItemView,
  className:          'tertiary-collection',
  childViewOptions: function (model){
    return { model: model, roomModel: this.roomModel };
  },

  initialize: function(attrs) {
    this.roomModel = attrs.roomModel;
  },
});
