'use strict';

var _          = require('underscore');
var Marionette = require('backbone.marionette');
var RAF        = require('utils/raf');
var template   = require('./base-collection-view.hbs');
var context            = require('utils/context');

module.exports = Marionette.CompositeView.extend({

  template: template,
  childViewContainer: '.js-collection-list',

  childViewOptions: function(model) {
    return { model: model, roomMenuModel: this.roomMenuModel };
  },

  buildChildView: function(model, ItemView, attrs) {
    var index = this.collection.indexOf(model);
    return new ItemView(_.extend({}, attrs, {
      model: model,
      index: index,
    }));
  },

  modelEvents: {
    'change:active': 'onModelChangeActiveState',
    'change:header': 'render',
  },

  collectionEvents: {
    'add reset remove update': 'onCollectionUpdate',
  },

  childEvents: {
    'item:clicked': 'onItemClicked',
  },

  constructor: function(attrs) {
    this.bus        = attrs.bus;
    this.collection = attrs.collection;
    this.listenTo(context.troupe(), 'change:id', this.updateSelectedModel, this);
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

  updateSelectedModel: function() {
    var selectedModel      = this.collection.findWhere({ selected: true });
    var newlySelectedModel = this.collection.findWhere({ id: context.troupe().get('id') });

    if (selectedModel) selectedModel.set('selected', false);
    if (newlySelectedModel) newlySelectedModel.set('selected', true);
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

  onDestroy: function() {
    this.stopListening(context.troupe());
  },

});
