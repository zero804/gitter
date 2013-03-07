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

  var ChatInputView = TroupeViews.Base.extend({
    template: template,
    chatMessageLimit: PAGE_SIZE,

    events: {
      "keydown textarea":  "detectReturn",
      "focusout textarea": "onFocusOut"
    },

    getRenderData: function() {
      return {
        user: window.troupeContext.user
      };
    },

    afterRender: function() {
      $('#chat-input-textarea').placeholder();
    },

    onFocusOut: function() {
      if (this.compactView) this.send();
    },

    detectReturn: function(e) {
      if(e.keyCode == 13) {
        return this.send();
      }
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
