'use strict';

var _             = require('underscore');
var Marionette    = require('backbone.marionette');
var itemTemplate  = require('./primary-collection-view.hbs');
var getRoomAvatar = require('utils/get-room-avatar');

var ItemView = Marionette.ItemView.extend({
  template: itemTemplate,
  serializeData: function() {
    var data = this.model.toJSON();
    return _.extend({}, data, {
      roomAvatarUrl:  getRoomAvatar(data.name),
    });
  },
});

module.exports = Marionette.CollectionView.extend({
  childView: ItemView,
  initialize: function(options) {
    this.model = options.model;
    this.listenTo(options.model, 'change:state', this.onModelStateChange, this);
    this.listenTo(this.collection, 'collection:change', this.render, this);
    this.onModelStateChange(this.model, this.model.get('state'));
  },

  onModelStateChange: function (model, val){ /*jshint unused: true*/
    this.$el.toggleClass('active', (val !== 'search'));
  },
});
