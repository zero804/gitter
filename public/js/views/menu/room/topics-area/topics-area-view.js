'use strict';

var Marionette = require('backbone.marionette');
var cocktail = require('backbone.cocktail');
var KeyboardEventMixin = require('../../../keyboard-events-mixin');
var ItemView = require('./category-item-view');

var template = require('./topics-area-view.hbs');

var TopicsAreaView = Marionette.CompositeView.extend({
  template: template,
  childView: ItemView,
  childViewContainer: '.js-left-menu-topics-category-list',

  initialize: function(attrs) {
    this.bus = attrs.bus;
  },

});

cocktail.mixin(TopicsAreaView, KeyboardEventMixin);


module.exports = TopicsAreaView;
