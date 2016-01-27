'use strict';

var Marionette    = require('backbone.marionette');
var _             = require('underscore');
var template      = require('./tertiary-collection-view.hbs');
var itemTemplate  = require('./tertiary-collection-item-view.hbs');
var getRoomAvatar = require('utils/get-room-avatar');

var ItemView = Marionette.ItemView.extend({
  template: itemTemplate,
  serializeData: function(){
    var data = this.model.toJSON();
    return _.extend({}, data, {
      avatarUrl: getRoomAvatar(data.name || ' '),
    });
  }
});

module.exports =  Marionette.CompositeView.extend({
  template:           template,
  childView:          ItemView,
  childViewContainer: '#tertiary-collection-list',
  className:          'tertiary-collection',
  modelEvents: {
    'change:tertiaryCollectionActive': 'onModelActiveStateChange',
  },

  initialize: function (){
    this.onModelActiveStateChange(this.model, this.model.get('tertiaryCollectionActive'));
  },

  onModelActiveStateChange: function (model, val){//jshint unused: true
    this.$el.toggleClass('active', !!val);
  },
});
