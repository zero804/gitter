"use strict";
var Marionette = require('backbone.marionette');
var appEvents = require('utils/appevents');
var hasScrollBars = require('utils/scrollbar-detect');

var ChatEditView = Marionette.ItemView.extend({

  events: {
    'input': 'onTextChange',
    'blur': 'resetTextareaSize',
  },

  initialize: function() {
    if(hasScrollBars()) {
      this.$el.addClass('scroller');
    }

    this.onTextChange();
  },

  processInput: function() {
    this.trigger('save', this.$el.val());
  },

  onTextChange: function() {
    if (this.$el.val()) {
      this.expandTextareaIfNeeded();
    } else {
      this.shrinkTextarea();
    }
  },

  resetTextareaSize: function() {
    this.shrinkTextarea();
    this.expandTextareaIfNeeded();
  },

  shrinkTextarea: function() {
    this.$el.css('height', '');
    appEvents.trigger('chatCollectionView:viewportResize', false);
  },

  expandTextareaIfNeeded: function() {
    var $textarea = this.$el;
    var textarea = $textarea[0];
    var currentHeight = textarea.offsetHeight;
    var scrollHeight = textarea.scrollHeight;
    var maxHeight = window.innerHeight / 2;

    var newHeight = Math.min(scrollHeight, maxHeight);

    if (newHeight > currentHeight) {
      $textarea.css('height', newHeight);
      appEvents.trigger('chatCollectionView:viewportResize', true);
    }
  },

});

module.exports = ChatEditView;
