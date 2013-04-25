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
  'jquery_placeholder'
], function($, _, Backbone, Marionette, TroupeViews, template, chatModels, moment) {
  "use strict";

  var PAGE_SIZE = 50;

  var originalChatInputHeight;
  var chatLines = 2;

  var chatPadding = parseInt($('#frame-chat').css('padding-bottom'),10);
  var originalChatPadding = chatPadding;


  var ChatInputView = TroupeViews.Base.extend({
    template: template,
    chatMessageLimit: PAGE_SIZE,

    events: {
      "keyup textarea": "detectNewLine",
      "keydown textarea":  "detectReturn",
      "focusout textarea": "onFocusOut"
    },

    initialize: function(options) {
      this.scrollDelegate = options.collectionViewScrollDelegate;
    },

    getRenderData: function() {
      return {
        user: window.troupeContext.user
      };
    },

    afterRender: function() {
      originalChatInputHeight = $('#chat-input-textarea').height();
      $('#chat-input-textarea').placeholder();
    },

    onFocusOut: function() {
      if (this.compactView) this.send();
    },

    resetInput: function() {
      chatLines = 2;
      chatPadding = originalChatPadding;
      $('#chat-input-textarea').height(originalChatInputHeight);
      $('#frame-chat').css('padding-bottom', chatPadding);

    },

    resizeInput: function() {
      var lht = parseInt($('#chat-input-textarea').css('lineHeight'),10);
      var height = $('#chat-input-textarea').prop('scrollHeight');
      var currentLines = Math.floor(height / lht);

      if (currentLines > chatLines ) {
        chatLines++;
        var newHeight = $('#chat-input-textarea').height() + 22;
        $('#chat-input-textarea').height(newHeight);
        chatPadding = chatPadding + 22;
        $('#frame-chat').css('padding-bottom', chatPadding);
        this.scrollDelegate.scrollToBottom();
      }
    },

    detectNewLine: function(e) {
      if (e.keyCode ==13 && e.ctrlKey) {
        if (window._troupeCompactView !== true) this.resizeInput();
      }
    },

    detectReturn: function(e) {
      console.log("typing");
      if(e.keyCode == 13 && !e.ctrlKey) {
        if (window._troupeCompactView !== true) this.resetInput();
        return this.send();
      }

      if (window._troupeCompactView !== true) this.resizeInput();
    },

    send: function() {
      var chatBox = this.$el.find("textarea");
      var val = chatBox.val().trim();
      if(val) {
        this.collection.create({
          text: val,
          fromUser: window.troupeContext.user,
          sent: moment()
        });

        chatBox.val('');
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

  return ChatInputView;
});
