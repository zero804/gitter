"use strict";
var Marionette = require('backbone.marionette');
var $ = require('jquery');
var appEvents = require('utils/appevents');
var hasScrollBars = require('utils/scrollbar-detect');
var isMobile = require('utils/is-mobile');
var drafty = require('components/drafty');
var cocktail = require('cocktail');
var KeyboardEventsMixin = require('views/keyboard-events-mixin');
var RAF = require('utils/raf');
require('jquery-textcomplete');
require('views/behaviors/tooltip');

function calculateMaxHeight() {
  // TODO: this sucks. normalise everything to HEADER
  var header = $("#header-wrapper");
  if(!header.length) header = $("header");

  var headerHeight = header.height();

  return $(document).height() - headerHeight - 140;
}

var ComposeMode = function() {
  var stringBoolean = window.localStorage.getItem('compose_mode_enabled') || 'false';
  this.disabled = JSON.parse(stringBoolean);
};

ComposeMode.prototype.toggle = function() {
  this.disabled = !this.disabled;
  var stringBoolean = JSON.stringify(this.disabled);
  window.localStorage.setItem('compose_mode_enabled', stringBoolean);
};

ComposeMode.prototype.isEnabled = function() {
  return this.disabled;
};

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

var ChatInputBoxView = Marionette.ItemView.extend({
  events: {
    "keyup": "onKeyUp",
    "keydown": "onKeyDown",
    "blur": "onBlur"
  },

  keyboardEvents: {
    "chat.edit.openLast": "onKeyEditLast",
    "chat.send": "onKeySend"
  },

  // pass in the textarea as el for ChatInputBoxView
  // pass in a scroll delegate
  initialize: function(options) {
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

    if (!this.options.editMode) this.drafty = drafty(this.el);

    chatResizer.resetInput(true);

    this.composeMode = options.composeMode;
    this.chatResizer.resizeInput();
  },

  onRender: function() {
    if (this.options.autofocus) {
      var self = this;
      RAF(function() {
        // firefox only respects the "autofocus" attr if it is present on source html
        // also, dont show keyboard right away on mobile
        // Also, move the cursor to the end of the textarea text

        self.setCaretPosition(self.$el.val().length);
        self.el.focus();
      });
    }
  },

  /**
   * setCaretPosition() moves the caret on a given text element
   * credits to http://blog.vishalon.net/index.php/javascript-getting-and-setting-caret-position-in-textarea/
   */
  setCaretPosition: function(position) {
    var el = this.el;
    if (el.setSelectionRange) {
      el.focus();
      el.setSelectionRange(position,position);
      return;
    } else if (el.createTextRange) {
      var range = el.createTextRange();
      range.collapse(true);
      range.moveEnd('character', position);
      range.moveStart('character', position);
      range.select();
      return;
    }
  },

  onBlur: function() {
    if(isMobile() && !this.isTypeaheadShowing()) {
      this.processInput();
    }
  },
  onKeyDown: function(e) {
    if (e.keyCode === 33 || e.keyCode === 34) {
      appEvents.trigger(e.keyCode === 33 ? 'chatCollectionView:pageUp' : 'chatCollectionView:pageDown');
      e.stopPropagation();
      e.preventDefault();
    }
  },
  onKeyUp: function() {
    this.chatResizer.resizeInput();
  },

  onKeyEditLast: function() {
    if(!this.$el.val()) this.trigger('editLast');
  },

  onKeySend: function(event, handler) {
    var isComposeModeEnabled = this.composeMode && this.composeMode.isEnabled();
    // Has a modifier or not in compose mode
    var shouldHandle = handler.mods.length || !isComposeModeEnabled;
    // Need to test behaviour with typeahead
    if(!this.isTypeaheadShowing() && shouldHandle) {
      if(this.hasVisibleText()) {
        this.processInput();
      }
      event.preventDefault();
      return false;
    }
  },

  processInput: function() {
    var cmd = this.options.commands && this.options.commands.findMatch(this.$el.val());
    if(cmd && cmd.action) {
      cmd.action(this);
    } else {
      this.send();
    }
  },

  send: function() {
    this.trigger('save', this.$el.val());
    this.reset();
  },

  reset: function() {
    $('#chatInputForm').trigger('reset');
    this.el.value = '';
    if (this.drafty) this.drafty.reset(); // Drafty is disabled in editMode
    this.chatResizer.resetInput();
  },

  append: function(text, options) {
    var current = this.$el.val();
    var start = current.length;
    if(!current || current.match(/\s+$/)) {
      current = current + text;
    } else {
      if(options && options.newLine) {
        start++;
        current = current + '\n' + text;
      } else {
        current = current + ' ' + text;
      }
    }
    this.chatResizer.resizeInput();
    this.$el.val(current);
    this.el.setSelectionRange(current.length, current.length);
    this.el.focus();

    this.el.scrollTop = this.el.clientHeight;
  },

  isTypeaheadShowing: function() {
    return this.$el.parent().find('.dropdown-menu').is(":visible");
  },

  hasVisibleText: function() {
    return !this.$el.val().match(/^\s+$/);
  }

});

cocktail.mixin(ChatInputBoxView, KeyboardEventsMixin);

module.exports = ChatInputBoxView;
