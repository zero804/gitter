'use strict';

var _ = require('underscore');
var toggleClass = require('../../../../../utils/toggle-class');
var template = require('./close-view.hbs');
var ItemView = require('../minibar-item-view');
var closeViewMixin = require('./close-view-mixin');
var cocktail = require('backbone.cocktail');

var CloseIconView= ItemView.extend({
  template: template,

  ui: _.extend({}, ItemView.prototype.ui, {
    toggleButton: '.js-menu-toggle-button',
    toggleIcon: '.js-menu-toggle-icon'
  }),

  events: {
    'mouseenter': 'onItemMouseEnter',
    'mouseleave': 'onItemMouseLeave',
    'click': 'onItemClicked'
  },

  initialize: function(attrs) {
    this.iconOpts = _.extend({}, this.defaults, (attrs.icon || {}));
    this.iconHover = false;
    this.roomMenuModel = attrs.roomMenuModel;
    this.listenTo(this.roomMenuModel, 'change:roomMenuIsPinned', this.updatePinnedState, this);
  },

  onItemMouseEnter: function() {
    this.iconHover = true;
    this.deflectArms();
  },

  onItemMouseLeave: function() {
    this.iconHover = false;
    this.deflectArms();
  },

  onItemClicked: function() {
    this.trigger('minibar-item:close');
  },

  getPinnedState: function(){
    return !!this.roomMenuModel.get('roomMenuIsPinned');
  },

  updatePinnedState: function() {
    var isPinned = this.getPinnedState();
    toggleClass(this.ui.toggleIcon[0], this.iconOpts.pinStateClass, isPinned);
    this.deflectArms();
  },

  onDestroy: function() {
    this.stopListening(this.roomMenuModel);
  },

  onRender: function() {
    this.setupCloseIcon();
  }

});

cocktail.mixin(CloseIconView, closeViewMixin);
module.exports = CloseIconView;
