"use strict";
var Marionette = require('backbone.marionette');
var $ = require('jquery');
var appEvents = require('utils/appevents');
var hasScrollBars = require('utils/scrollbar-detect');

function calculateMaxHeight() {
  // TODO: this sucks. normalise everything to HEADER
  var header = $("#header-wrapper");
  if(!header.length) header = $("header");

  var headerHeight = header.height();

  return $(document).height() - headerHeight - 140;
}

var ChatCollectionResizer = function(options) {
  var el = options.el;
  var $el = $(el);

  this.resetInput = function(initial) {
    $el.css({ height: '', 'overflow-y': '' });

    adjustScroll(initial);
  };

  this.resizeInput = function() {
    var maxHeight = calculateMaxHeight();
    var scrollHeight = el.scrollHeight;
    var height = scrollHeight > maxHeight ? maxHeight : scrollHeight;
    var offsetHeight = el.offsetHeight;

    if(offsetHeight == height) {
      return;
    }

    $el.height(height);

    adjustScroll();
  };

  function adjustScroll(initial) {
    /* Tell the chatCollectionView that the viewport will resize
     * the argument is whether the resize is animated */
    appEvents.trigger('chatCollectionView:viewportResize', !initial);
  }
};

var ChatEditView = Marionette.ItemView.extend({

  events: {
    "keyup": "onKeyUp"
  },

  initialize: function() {
    if(hasScrollBars()) {
      this.$el.addClass("scroller");
    }

    var chatResizer = new ChatCollectionResizer({
      el: this.el
    });

    this.chatResizer = chatResizer;

    this.listenTo(this, 'change', function() {
      chatResizer.resizeInput();
    });

    chatResizer.resetInput(true);

    this.chatResizer.resizeInput();
  },

  onKeyUp: function() {
    this.chatResizer.resizeInput();
  },

  processInput: function() {
    this.trigger('save', this.$el.val());
  }

});

module.exports = ChatEditView;
