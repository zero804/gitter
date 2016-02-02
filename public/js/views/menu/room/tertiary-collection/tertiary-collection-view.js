'use strict';

var Marionette    = require('backbone.marionette');
var _             = require('underscore');
var template      = require('./tertiary-collection-view.hbs');
var itemTemplate  = require('./tertiary-collection-item-view.hbs');
var getRoomAvatar = require('utils/get-room-avatar');

var ItemView = Marionette.ItemView.extend({
  template: itemTemplate,
  serializeData: function() {
    var data = this.model.toJSON();
    return _.extend({}, data, {
      avatarUrl: getRoomAvatar(data.name || ' '),
    });
  },
});

module.exports =  Marionette.CompositeView.extend({
  template:           template,
  childView:          ItemView,
  childViewContainer: '#tertiary-collection-list',
  className:          'tertiary-collection',
  modelEvents: {
    'change:tertiaryCollectionActive': 'onModelActiveStateChange',
    'change:tertiaryCollectionHeader': 'render'
  },

  initialize: function() {
    this.onModelActiveStateChange(this.model, this.model.get('tertiaryCollectionActive'));
  },

  onModelActiveStateChange: function() {
    this.$el.toggleClass('active', this.model.get('tertiaryCollectionActive'));
  },

  //TODO This is meant to hide the empty collection but causes recursion
  //refactor it to use an empty view that hides the DOM element
  //jp 2/2/16
  onBeforeRender: function(){
    this.$el.addClass('active');
    //if(this.collection.length <= 0) {
      //return this.$el.removeClass('active');
    //}
    //Marionette.CompositeView.prototype.render.apply(this, arguments);
    //this.onModelActiveStateChange();
  }

});
