"use strict";

var Marionette = require('backbone.marionette');
var modalRegion = require('components/modal-region');
var ChatContainerView = require('views/chat/chatContainerView');

/* Decorators */
var emojiDecorator = require('views/chat/decorators/emojiDecorator');
var TroupeMenu = require('views/menu/troupeMenu');
var mobileDecorator = require('views/chat/decorators/mobileDecorator');
var ChatInputView = require('views/chat/chatInputView');

var $ = require('jquery');
require('jquery-hammerjs');

require('views/behaviors/isomorphic');

module.exports = Marionette.LayoutView.extend({
  template: false,
  el: 'body',

  behaviors: {
    Isomorphic: {
      chat: { el: '#content-wrapper', init: 'initChatRegion' },
      menu: { el: '#menu-region', init: 'initMenuRegion' },
      input: { el: '#chat-input', init: 'initInputRegion' },
    }
  },

  ui: {
    mainPage: '#mainPage',
    showTroupesButton: '#showTroupesButton'
  },

  events: {
    'tap': 'tap',
    'touch @ui.showTroupesButton': 'stopClickEvents',
    'tap @ui.showTroupesButton': 'showHideTroupes'
  },

  initialize: function(options) {
    this.chatCollection = options.chatCollection;
    this.dialogRegion = modalRegion;
  },

  onRender: function() {
    this.$el.hammer();
    this.ui.showTroupesButton.toggle(!this.options.hideMenu);
  },

  initChatRegion: function(optionsForRegion) {
    return new ChatContainerView(optionsForRegion({
      collection: this.options.chatCollection,
      decorators: [emojiDecorator, mobileDecorator]
    }));
  },

  initMenuRegion: function(optionsForRegion) {
    return new TroupeMenu(optionsForRegion());
  },

  initInputRegion: function(optionsForRegion) {
    return new ChatInputView(optionsForRegion({
      collection: this.options.chatCollection,
    }));
  },

  tap: function() {
    this.makeAppFullScreen();
    this.ui.mainPage.removeClass('partiallyOffScreen');
  },

  makeAppFullScreen: function() {
    $('html, body').scrollTop($(document).height());
  },

  stopClickEvents: function(e) {
    e.gesture.preventDefault();
    e.stopPropagation();
  },

  showHideTroupes: function(e) {
    this.makeAppFullScreen();
    this.ui.mainPage.toggleClass('partiallyOffScreen');
    e.stopPropagation();
  }

});
