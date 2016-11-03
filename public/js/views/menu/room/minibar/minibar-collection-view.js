'use strict';

var Marionette = require('backbone.marionette');
var ItemView = require('./minibar-item-view');
var domIndexById = require('../../../../utils/dom-index-by-id');
var toggleClass = require('../../../../utils/toggle-class');


var MinibarView = Marionette.CollectionView.extend({
  tagName:   'ul',
  id:        'minibar-list',

  ui: {
    collection: '.minibar-collection-list',
  },

  childView: ItemView,
  childEvents: {
    'minibar-item:activated': 'onItemActivated',
  },

  //if an element exists in the dom pass that as the el prop
  childViewOptions: function(model, index) {
    var selector = model.get('id');
    var element = this.domMap[selector];
    var opts = {
      index: index,
      model: model,
      roomMenuModel: this.roomMenuModel
    };

    if(element) { opts.el = element; }
    return opts;
  },

  initialize: function(attrs) {
    this.dndCtrl = attrs.dndCtrl;
    this.roomMenuModel = attrs.roomMenuModel;
    this.roomCollection = attrs.roomCollection;

    this.listenTo(this.dndCtrl, 'dnd:start-drag', this.onDragStart, this);
    this.listenTo(this.dndCtrl, 'dnd:end-drag', this.onDragEnd, this);
  },

  onBeforeRender: function () {
    this.domMap = domIndexById(this.el);
    this.dndCtrl.removeContainer(this.ui.collection[0]);
  },

  onRender: function() {
    this.dndCtrl.pushContainer(this.el);
  },

  onDragStart: function () {
    toggleClass(this.el, 'dragging', true);
  },

  onDragEnd: function () {
    toggleClass(this.el, 'dragging', false);
  },

  onItemActivated: function(view, model) {
    this.trigger('minibar-item:activated', view, model);
  },

});


module.exports = MinibarView;
