'use strict';

var Marionette = require('backbone.marionette');
var RAF        = require('utils/raf');
var template   = require('./base-collection-view.hbs');
var context    = require('utils/context');

module.exports = Marionette.CompositeView.extend({

  template:           template,
  className:          'collection',
  childViewContainer: '.js-collection-list',

  childViewOptions: function(model) {
    var index = this.collection.indexOf(model);
    return {
      model:     model,
      index:     index,
      menuState: this.roomMenuModel.get('state'),
      roomMenuModel: this.roomMenuModel,
    };
  },

  modelEvents: {
    'change:header': 'render',
  },

  collectionEvents: {
    'filter-complete sync': 'render',
    'add remove reset': 'onFilterComplete',
  },

  childEvents: {
    'item:clicked': 'onItemClicked',
  },

  constructor: function(attrs) {
    this.bus           = attrs.bus;
    this.collection    = attrs.collection;
    this.roomMenuModel = attrs.roomMenuModel;
    this.listenTo(context.troupe(), 'change:id', this.updateSelectedModel, this);
    Marionette.CompositeView.prototype.constructor.apply(this, arguments);
  },

  updateSelectedModel: function() {
    var selectedModel      = this.collection.findWhere({ selected: true });
    var newlySelectedModel = this.collection.findWhere({ id: context.troupe().get('id') });

    if (selectedModel) selectedModel.set('selected', false);
    if (newlySelectedModel) newlySelectedModel.set('selected', true);
  },

  onItemClicked: function(view) {
    var model = view.model;
    var name = (model.get('uri') || model.get('url') || model.get('name') || model.get('fromUser').username);
    var url  = (name[0] !== '/') ?  '/' + name : name;
    this._triggerNavigation(url, 'chat', name);
  },

  _triggerNavigation: function (url, type, name){
    this.bus.trigger('navigation', url, type, name);
  },

  onFilterComplete: function() {
    this.setActive();
  },

  onBeforeRender: function() {
    this.setLoaded(false);
  },

  onRender: function() {
    RAF(function() {
      this.setActive();
      this.setLoaded();
    }.bind(this));
  },

  setActive: function (){
    this.$el.toggleClass('active', this.model.get('active'));
  },


  setLoaded: function (val){
    val = (val || true);
    this.$el.toggleClass('loaded', val);
  },

  onDestroy: function() {
    this.stopListening(context.troupe());
  },

  render: function() {
    Marionette.CompositeView.prototype.render.apply(this, arguments);
  },

});
