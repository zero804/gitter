'use strict';

var Marionette = require('backbone.marionette');
var RAF        = require('utils/raf');
var template = require('./base-collection-view.hbs');

module.exports = Marionette.CompositeView.extend({

  template: template,
  childViewContainer: '.js-collection-list',
  modelEvents: {
    'change:active': 'onModelChangeActiveState',
    'change:header': 'render',
  },

  collectionEvents: {
    'add reset remove update': 'onCollectionUpdate',
  },

  constructor: function(attrs) {
    this.bus = attrs.bus;
    this.collection = attrs.collection;
    Marionette.CompositeView.prototype.constructor.apply(this, arguments);
  },

  onModelChangeActiveState: function(model, val) { /*jshint unused: true*/
    this.render();
    RAF(function() {
      this.$el.toggleClass('active', val);
    }.bind(this));
  },

  onCollectionUpdate: function() {
    this.$el.toggleClass('empty', !this.collection.length);
  },

  onBeforeRender: function() {
    RAF(function() {
      this.$el.removeClass('loaded');
    }.bind(this));
  },

  onRender: function() {
    setTimeout(function() {
      RAF(function() {
        this.$el.addClass('loaded');
      }.bind(this));
    }.bind(this), 10);
  },

});
