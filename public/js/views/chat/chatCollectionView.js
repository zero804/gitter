/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'jquery',
  'underscore',
  'utils/context',
  'log!chat-collection-view',
  'collections/chat',
  'views/widgets/avatar',
  'components/unread-items-client',
  'marionette',
  'views/base',
  'utils/appevents',
  './chatItemView',
  'utils/rollers',
  'utils/never-ending-story',
  'bootstrap_tooltip'
], function($, _, context, log, chatModels, AvatarView, unreadItemsClient, Marionette, TroupeViews, appEvents, chatItemView, Rollers, NeverEndingStory /* tooltip*/) {

  "use strict";

  var PAGE_SIZE = 15;

  /*
  * View
  */
  var ChatCollectionView = Marionette.CollectionView.extend({
    itemView: chatItemView.ChatItemView,
    itemViewOptions: function() {
      return { userCollection: this.userCollection/*, scrollDelegate: this.scrollDelegate */};
    },
    chatMessageLimit: PAGE_SIZE,

    initialize: function(options) {
      // this.hasLoaded = false;

      var contentFrame = document.querySelector('#content-frame');

      this.rollers = new Rollers(contentFrame);

      var scroll = new NeverEndingStory(contentFrame);
      scroll.on('approaching.end', function() {
        this.loadNextMessages();
      }, this);
      this.scroll = scroll;

      this.initializeSorting();
      this.userCollection = options.userCollection;

      // CODEDEBT: Move unread-item-tracking into it's own module
      this.findChatToTrack();
      this.listenTo(this.collection, 'add', function() {
        if(this.unreadItemToTrack) return;
        this.findChatToTrack();
      });
      this.listenTo(this.collection, 'remove', function(e, model) {
        if(this.unreadItemToTrack && model === this.unreadItemToTrack) {
          this.findChatToTrack();
        }
      });
      this.listenTo(this.collection, 'change', function() {
        if(!this.unreadItemToTrack) return;
        if(this.unreadItemToTrack.get('unread')) return;

        this.findChatToTrack();
      });

      /* Scroll to the bottom when the user sends a new chat */
      this.listenTo(appEvents, 'chat.send', function() {
        this.rollers.scrollToBottom();
      });

    },

    findChatToTrack: function() {
      if(this._findingNextUnread) return;

      var nextUnread = this.collection.findWhere({ unread: true });

      this.unreadItemToTrack = nextUnread;

      if(!nextUnread) {
        this.rollers.cancelTrackUntil();
      } else {
        var view = this.children.findByModel(nextUnread);

        /* Can't find the view, it may not have been generated yet */
        if(view) {
          this.rollers.trackUntil(view.el);
        } else {
          this._findingNextUnread = true;
       }
      }
    },

    onAfterItemAdded: function() {
      if(!this._findingNextUnread) return;

      var view = this.children.findByModel(this.unreadItemToTrack);
      if(view) {
        this._findingNextUnread = false;
        this.rollers.trackUntil(view.el);
      }
    },

    beforeClose: function() {
      this.scroll.disable();
    },

    loadNextMessages: function() {
      log("Loading next message chunk.");

      var ids = this.collection.map(function(m) { return m.get('id'); });
      var lowestId = _.min(ids, function(a, b) {
        if(a < b) return -1;
        if(a > b) return 1;
        return 0;
      });

      if(lowestId === Infinity) {
        log('No messages loaded, cancelling pagenation (!!)');
        return;
      }

      var self = this;
      this.collection.fetch({
        update: true,
        add: true,
        remove: false, // chat messages are never deleted
        data: {
          beforeId: lowestId,
          limit: this.chatMessageLimit
        },
        success: function(data, resp) {
          self.scroll.loadComplete();

          if(!resp.length) {
            // turn off infinite scroll if there were no new messages retrieved
            self.scroll.disable();
          }
        },
        error: function() {
          self.scroll.loadComplete();
        }
      });

    }

  });

  _.extend(ChatCollectionView.prototype, TroupeViews.SortableMarionetteView);

  return ChatCollectionView;
});
