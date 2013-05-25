/*jshint unused:true, browser:true */

define([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'views/base',
  'hbs!./tmpl/chatInputView',
  'collections/chat',
  '../../utils/momentWrapper',
  'jquery-placeholder'
], function($, _, Backbone, Marionette, TroupeViews, template, chatModels, moment) {
  "use strict";

  var PAGE_SIZE = 50;

  var ChatInputView = TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      this.scrollDelegate = options.scrollDelegate;
    },

    getRenderData: function() {
      return {
        user: window.troupeContext.user
      };
    },

    afterRender: function() {

      this.inputBox = new ChatInputBoxView({
        el: this.$el.find('.trpChatInputBoxTextArea'),
        scrollDelegate: this.scrollDelegate
      });

      this.listenTo(this.inputBox, 'save', this.send);
    },

    send: function(val) {
      if(val) {
        this.collection.create({
          text: val,
          fromUser: window.troupeContext.user,
          sent: moment()
        });

        // go to the bottom of the page when sending a new message
        if(window._troupeCompactView) {
          $('#chat-wrapper').scrollTop($('#chat-frame').height());
        } else {
          $(window).scrollTop($(document).height());
        }

      }
      return false;
    }
  });

  var chatPadding = parseInt($('#frame-chat').css('padding-bottom'),10);
  var originalChatPadding = chatPadding;

  var ChatInputBoxView = TroupeViews.Base.extend({
    chatMessageLimit: PAGE_SIZE,

    events: {
      "keyup": "detectNewLine",
      "keydown":  "detectReturn",
      "focusout": "onFocusOut"
    },

    // pass in the textarea as el for ChatInputBoxView
    // pass in a scroll delegate
    initialize: function(options) {

      this.chatLines = 2;

      this.scrollDelegate = options.scrollDelegate;

      this.originalChatInputHeight = this.$el.height();
      this.$el.placeholder();

      this.resizeInput();
    },

    onFocusOut: function() {
      if (this.compactView) this.send();
    },

    resetInput: function() {
      this.chatLines = 2;
      chatPadding = originalChatPadding;
      this.$el.height(this.originalChatInputHeight);
      $('#frame-chat').css('padding-bottom', chatPadding);

    },

    resizeInput: function() {
      var lht = parseInt(this.$el.css('lineHeight'),10);
      var height = this.$el.prop('scrollHeight');
      var currentLines = Math.floor(height / lht);
      var wasAtBottom = this.scrollDelegate.isAtBottom();

      if (currentLines != this.chatLines) {
        this.chatLines = currentLines;
        var newHeight = currentLines * lht;

        this.$el.height(newHeight);
        var frameChat = $('#frame-chat'), isChild = frameChat.find(this.el).length;
        if (!isChild) {
          chatPadding = originalChatPadding + Math.abs(this.originalChatInputHeight - newHeight);
          $('#frame-chat').css('padding-bottom', chatPadding);
        }
        if (wasAtBottom) {
          this.scrollDelegate.scrollToBottom();
        }
      }
    },

    detectNewLine: function(e) {
      if (e.keyCode ==13 && e.ctrlKey) {
        if (window._troupeCompactView !== true) this.resizeInput();
      }
    },

    detectReturn: function(e) {
      if(e.keyCode == 13 && !e.ctrlKey) {
        if (window._troupeCompactView !== true) this.resetInput();
        e.stopPropagation();
        e.preventDefault();

        this.send();
        return;
      }

      if (window._troupeCompactView !== true) this.resizeInput();
    },

    send: function() {
      this.trigger('save', this.$el.val());

      this.$el.val('');
    }
  });

  return { ChatInputView: ChatInputView, ChatInputBoxView: ChatInputBoxView };
});
