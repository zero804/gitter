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
  './chatItemView',
  'utils/rollers',
  'utils/never-ending-story',
  'bootstrap_tooltip'
], function($, _, context, log, chatModels, AvatarView, unreadItemsClient, Marionette, TroupeViews, chatItemView, Rollers, NeverEndingStory /* tooltip*/) {

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

      //this.updateUnreadItemTracking();

      //_.bindAll(this, 'chatWindowScroll');
      this.initializeSorting();
      this.userCollection = options.userCollection;

      this.findChatToTrack();

      this.collection.on('add', function() {
        if(this.unreadItemToTrack) return;
        this.findChatToTrack();
      }, this);

      this.collection.on('remove', function(e, model) {
        if(this.unreadItemToTrack && model === this.unreadItemToTrack) {
          this.findChatToTrack();
        }
      }, this);

      this.collection.on('change', function() {

        if(!this.unreadItemToTrack) return;
        if(this.unreadItemToTrack.get('unread')) return;

        this.findChatToTrack();
      }, this);

      // if (window._troupeCompactView) {
      //   ChatCollectionView.$scrollOf = $('#content-frame');
      //   ChatCollectionView.$container = $('#chat-frame');
      // } else {
      //   ChatCollectionView.$scrollOf = $(window);
      //   ChatCollectionView.$container = $(document);
      // }

      //this.infiniteScrollDelegate = new scrollDelegates.InfiniteScrollDelegate(ChatCollectionView.$scrollOf, ChatCollectionView.$container, this.collection.modelName, findTopMostUnreadItem);

      //function findTopMostUnreadItem(itemType) {
      //  return unreadItemsClient.findTopMostUnreadItemPosition(itemType, ChatCollectionView.$container, ChatCollectionView.$scrollOf);
      //}

      // var self = this;
      // // wait for the first reset (preloading) before enabling infinite scroll
      // // and scroll to bottom once the first rendering is complete
      // if (this.collection.length === 0) {
      //   this.collection.once('sync reset', function() {
      //     onInitialLoad();
      //   });
      // } else {
      //   onInitialLoad();
      // }

      // function onInitialLoad() {
      //   if(self.hasLoaded) return;
      //   self.hasLoaded = true;
      //   self.hasRendered = true; // the initial set of chats have been rendered

      //   //ChatCollectionView.$scrollOf.on('scroll', self.chatWindowScroll);
      //   //self.scrollDelegate.scrollToBottom();
      // }
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

    // updateUnreadItemTracking: function() {
    //   this.unreadItemToTrack = this.firstUnreadView();
    //   if(this.unreadItemToTrack) {
    //     scroll.trackUntil(this.unreadItemToTrack);
    //   } else {
    //     scroll.cancelTrackUntil();
    //   }

    // },

    // onClose: function(){
    //   $(document).off('eyeballStateChange', this.eyeballStateChange);
    // },

    beforeClose: function() {
      this.scroll.disable();
      //ChatCollectionView.$scrollOf.off('scroll', this.chatWindowScroll);
    },

    // onBeforeRender: function() {
    //   // disable infinite scroll until render is complete
    //   this.hasRendered = false;
    // },

    // // onRender runs after the collection view has been rendered
    // onRender: function() {
    //   if (this.hasLoaded) this.hasRendered = true; // the render only counts if the collection has received a reset / sync event (ie it has been populated before trying to render)

    //   // this is also done in initialize on collection sync event

    //   // log("scrollOf scroll: " + this.$scrollOf.scrollTop() + " container height: " + this.$container.height());
    //   // this is an ugly hack to deal with some weird timing issues
    //   var self = this;
    //   if (this.collection.length > 0) {
    //     //setTimeout(function() {
    //     //  // note: on mobile safari this only work when typing in the url, not when pressing refresh, it works well in the mobile app.
    //     //  log("onRender + 500ms: Initial scroll to bottom on page load");
    //     //  self.scrollDelegate.scrollToBottom();
    //     //}, 500);
    //   }
    // },

    // onAfterItemAdded: function(item) {
    //   // log("After an item was added");
    //   // this must only be called for when new messages are received (at the bottom), not while loading the collection (for new messages at the top)
    //   if (this.hasRendered && !this.loadingOlder) {
    //     //this.scrollDelegate.onAfterItemAdded(item);
    //   }
    // },

    // onBeforeItemAdded: function() {
    //   // we need to skip the scroll delegate while we are rendering (ie hasRendered) to avoid mobile being overloaded with scroll requests
    //   if (this.hasRendered && !this.loadingOlder) {
    //     //this.scrollDelegate.onBeforeItemAdded();
    //   }
    // },

    // chatWindowScroll: function() {
    //   if (this.hasScrolled && ChatCollectionView.$scrollOf.scrollTop() === 0) {
    //     this.loadNextMessages();
    //   }
    //   this.hasScrolled = true;
    // },

    loadNextMessages: function() {
      //if(this.loadingOlder || this.collection.isLoading()) return;
      //this.loadingOlder = true;

      log("Loading next message chunk.");
      //this.infiniteScrollDelegate.beforeLoadNextMessages();


      // this.collection.once('sync reset', function() {
      //   self.loadingOlder = false;
      //   self.infiniteScrollDelegate.afterLoadNextMessages();
      // });

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
            // $(ChatCollectionView.$scrollOf).off('scroll', self.chatWindowScroll);
            // self.loadingOlder = false;
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
