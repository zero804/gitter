/*jshint unused:true browser:true*/

define([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'bootstrap',
  'views/base',
  'hbs!./tmpl/chat',
  './chatViewItem',
  'collections/chat',
  '../../utils/momentWrapper'
], function($, _, Backbone, Marionette, _bootstrap, TroupeViews, template, ChatViewItem, chatModels, moment) {
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
      this.collection.setSortBy('-sent');
      this.collection.listen();

      this.addCleanup(function() {
        self.collection.unlisten();
      });

      this.loadNextMessages();
    },

    events: {
      "keydown #chat-input":          "detectReturn",
      "focusout #chat-input": "onFocusOut",
      "blur #chat-input" : "blurChat"
    },

    beforeClose: function() {
      $(window).unbind('scroll', this.scrollEventBound);
    },

    getRenderData: function() {
      return {
        user: window.troupeContext.user
      };
    },

    onFocusOut: function() {
      if (this.compactView) this.send();
    },

    blurChat: function(){
    },

    afterRender: function() {
      var CV = Marionette.CollectionView.extend(TroupeViews.SortableMarionetteView);

      this.collectionView = new CV({
        itemView: ChatViewItem,
        collection: this.collection,
        el: this.$el.find(".frame-chat"),
        initialize: function() {
          this.initializeSorting();
        }
      });
    },

    chatWindowScroll: function() {
      if($(window).scrollTop() == $(document).height() - $(window).height()) {
        this.loadNextMessages();
      }
    },

    detectReturn: function(e) {
      if(e.keyCode == 13) {
        return this.send();
      }
    },

    send: function() {
      var chatBox = $("#chat-input");
      var val = chatBox.val().trim();
      if(val) {
        this.collection.create({
          text: val,
          fromUser: window.troupeContext.user,
          sent: moment()
        });
        chatBox.val('');
      }
      return false;
    },

    loadNextMessages: function() {
      var self = this;

      function success(data/*, resp*/) {
        if(!data.length) {
          $(window).unbind('scroll', self.scrollEventBound);
          return;
        }

        self.chatMessageSkip += PAGE_SIZE;
      }

      this.collection.fetch({
        update: true,
        add: true,
        remove: false, // chat messages are never deleted
        data: {
          skip: this.chatMessageSkip,
          limit: this.chatMessageLimit
        },
        success: success
      });

    }

  });

  return ChatView;
});
