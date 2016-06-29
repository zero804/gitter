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
    'minibar-item:activated': 'onItemActivated',
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
  },

  onBeforeRender: function () {
    this.domMap = domIndexById(this.el);
  },

  onItemActivated: function(view, model) {
    this.trigger('minibar-item:activated', view, model);
  },

});


module.exports = MinibarView;
