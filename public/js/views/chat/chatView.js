// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./chat',
  'components/chat/chat-component',
  './chatViewItem',
  'collections/chat'
], function($, _, Backbone, TroupeViews, template, chat, ChatViewItem, chatModels) {
  "use strict";

  var PAGE_SIZE = 50;

  var ChatView = TroupeViews.Base.extend({
    template: template,
    chatMessageSkip: 0,
    chatMessageLimit: PAGE_SIZE,

    initialize: function() {
      var self = this;
      this.scrollEventBound = _.bind(this.chatWindowScroll, this);

      $(window).bind('scroll', this, this.scrollEventBound);
      this.collection = new chatModels.ChatCollection();
      this.collection.listen();

      this.addCleanup(function() {
        self.collection.unlisten();
      });

      this.loadNextMessages();
    },

    events: {
      "keydown .trpChatBox":          "detectReturn"
    },

    beforeClose: function() {
      $(window).unbind('scroll', this.scrollEventBound);
    },

    getRenderData: function() { return {}; },

    afterRender: function() {
      this.collectionView = new TroupeViews.Collection({
        itemView: ChatViewItem,
        collection: this.collection,
        el: this.$el.find(".frame-chat"),
        sortMethods: {
          "sent": function(model) {
            return model.get('sent');
          }
        },
        defaultSort: "-sent"
      });
    },

    chatWindowScroll: function() {
      if($(window).scrollTop() == $(document).height() - $(window).height()) {
        this.loadNextMessages();
      }
    },

    onMessage: function(event, msg) {
      var self = event.data;
      var current = msg.fromUser.id == window.troupeContext.user.id;

      $(".frame-chat", this.el).prepend(new ChatViewItem({ message: msg, current: current}).render().el);

      return;
    },

    detectReturn: function(e) {
      if(e.keyCode == 13) {
        return this.send();
      }
    },

    send: function() {
      var chatBox = $(".trpChatBox");
      var val = chatBox.val().trim();
      if(val) {
        chat.send(chatBox.val());
        chatBox.val('');
      }
      return false;
    },

    loadNextMessages: function() {
      var self = this;

      function success(data, resp) {
        if(!data.length) {
          $(window).unbind('scroll', self.scrollEventBound);
          return;
        }

        self.chatMessageSkip += PAGE_SIZE;
      }

      this.collection.fetch({ add: true, data: { skip: this.chatMessageSkip, limit: this.chatMessageLimit }, success: success });
    }

  });

  return ChatView;
});
