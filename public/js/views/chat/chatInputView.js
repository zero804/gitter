/*jshint unused:true browser:true*/

define([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'bootstrap',
  'views/base',
  'hbs!./tmpl/chatInputView',
  'collections/chat',
  '../../utils/momentWrapper'
], function($, _, Backbone, Marionette, _bootstrap, TroupeViews, template, chatModels, moment) {
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
        var newItem = this.collection.create({
          text: val,
          fromUser: window.troupeContext.user,
          sent: moment()
        });

        console.log("Inserted new item at " + this.collection.indexOf(newItem));
        chatBox.val('');
      }
      return false;
    }

  });

  return ChatInputView;
});
