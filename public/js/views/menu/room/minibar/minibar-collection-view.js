'use strict';

var _ = require('underscore');
var Marionette = require('backbone.marionette');
var ItemView = require('./minibar-item-view');
var domIndexById = require('../../../../utils/dom-index-by-id');

var MinibarView = Marionette.CollectionView.extend({
  tagName:   'ul',
  id:        'minibar-list',
  childView: ItemView,
  childEvents: {
    'minibar-item:keyboard-activated': 'onItemKeyboardActivated',
    'minibar-item:activated': 'onItemActivated',
    'minibar-item:close':   'onCloseClicked',
  },

  //if an element exists in the dom pass that as the el prop
  childViewOptions: function(model, index) {
    var selector = 'minibar-' + model.get('name');
    var element = this.domMap[selector];
    var opts = {
      index: index,
      model: model,
      roomMenuModel: this.model
    };

    if(!!element) { opts.el = element; }
    return opts;
  },

  initialize: function(attrs) {
    this.model = attrs.model;
    this.roomCollection = attrs.roomCollection;
    this.keyboardControllerView = attrs.keyboardControllerView;

    this.keyboardControllerView.inject(this.keyboardControllerView.constants.MINIBAR_KEY, [
      { collection: this.collection }
    ]);

    // For the normal arrowing through
    // when we have too many rooms to render instantly
    this.debouncedOnItemActivated = _.debounce(this.onItemActivated, 300);
    // Just for the quick flicks
    this.shortDebouncedOnItemActivated = _.debounce(this.onItemActivated, 100);
  },

  onBeforeRender: function () {
    this.domMap = domIndexById(this.el);
  },

  onItemActivated: function(view, model, activationSourceType) {
    this.trigger('minibar-item:activated', view, model, activationSourceType);
  },

  onItemKeyboardActivated: function(view, model) {
    // Arbitrary threshold based on when we can't render "instantly".
    // We don't want to delay too much because majority of users won't run into render shortcomings
    // and the delay could cause confusion for screen-reader users not recnogizing when
    // the switch happens
    if(this.roomCollection.length > 50) {
      this.debouncedOnItemActivated(view, model, 'keyboard');
    }
    else {
      this.shortDebouncedOnItemActivated(view, model, 'keyboard');
    }
  },

});


module.exports = MinibarView;
