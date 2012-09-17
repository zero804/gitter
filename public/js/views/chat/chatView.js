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
      this.collection.comparator = TroupeViews.reverseComparatorFunction(
                                    TroupeViews.sortByComparator(
                                      function(model) { return model.get('sent'); }
                                    )
                                   );
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
        el: this.$el.find(".frame-chat")//,
        //noItemsElement: this.$el.find("#frame-help"),
        /*sortMethods: {
          "mtime": function(file) {
            var versions = file.get('versions');
            if(!versions || !versions.length) return null;
            var version = versions.at(versions.length - 1);
            return version.get('createdDate');
          },
          "fileName": function(file) {
            var fileName = file.get('fileName');
            return fileName ? fileName.toLowerCase() : '';
          },
          "mimeType": function(file) {
            return file.get("mimeType");
          }
        }*/
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

        // TODO: speed this up
        /*var chatFrame = self.$el.find(".frame-chat");

        data.each(function(msg) {
          var current = msg.get('fromUser').id == window.troupeContext.user.id;

          chatFrame.append(new ChatViewItem({ message: msg.toJSON(), current: current}).render().el);
        });
        */
        self.chatMessageSkip += PAGE_SIZE;
      }

      this.collection.fetch({ add: true, data: { skip: this.chatMessageSkip, limit: this.chatMessageLimit }, success: success });

      /*
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/chatMessages",
        contentType: "application/json",
        data: { skip: this.chatMessageSkip, limit: this.chatMessageLimit },
        dataType: "json",
        type: "GET",
        success: function(data) {
        }
      });
      */
    }

  });

  return ChatView;
});
