// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./chat',
  'components/chat/chat-component',
  './chatViewItem'
], function($, _, Backbone, TroupeViews, template, chat, ChatViewItem) {
  var PAGE_SIZE = 50;

  var ChatView = TroupeViews.Base.extend({
    template: template,
    chatMessageSkip: 0,
    chatMessageLimit: PAGE_SIZE,

    initialize: function() {
      this.scrollEventBound = _.bind(this.chatWindowScroll, this);

      $(window).bind('scroll', this, this.scrollEventBound);

      $(document).bind('chat', this, this.onMessage);
      $(document).bind('userLoggedIntoTroupe', this.userLoggedIntoTroupe);
      $(document).bind('userLoggedOutOfTroupe', this.userLoggedOutOfTroupe);

      this.loadNextMessages();
    },

    events: {
      "keydown .trpChatBox":          "detectReturn"
    },

    beforeClose: function() {
      $(window).unbind('scroll', this.scrollEventBound);

      $(document).unbind('chat', this.onMessage);
      $(document).unbind('userLoggedIntoTroupe', this.userLoggedIntoTroupe);
      $(document).unbind('userLoggedOutOfTroupe', this.userLoggedOutOfTroupe);
    },

    getRenderData: function() { return {}; },

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
      chat.send(chatBox.val());
      chatBox.val('');
      return false;
    },

    loadNextMessages: function() {
      var self = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/chatMessages",
        contentType: "application/json",
        data: { skip: this.chatMessageSkip, limit: this.chatMessageLimit },
        dataType: "json",
        type: "GET",
        success: function(data) {
          if(!data.length) {
            $(window).unbind('scroll', self.scrollEventBound);
            return;
          }

          // TODO: speed this up
          var chatFrame = $(".frame-chat", this.el);

          for(var i = 0; i < data.length; i++) {
            var msg = data[i];
            var current = msg.fromUser.id == window.troupeContext.user.id;

            chatFrame.append(new ChatViewItem({ message: msg, current: current}).render().el);
          }


          self.chatMessageSkip += PAGE_SIZE;
        }
      });
    }

  });

  return ChatView;
});
