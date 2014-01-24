/* jshint unused:true, browser:true,  strict:true *//* global define:false */
define([
  'underscore',
  'utils/context',
  'log!chat-collection-view',
  'collections/chat',
  'views/widgets/avatar',
  'views/infinite-scroll-mixin',
  'components/unread-items-client',
  'marionette',
  'views/base',
  'utils/appevents',
  './chatItemView',
  'utils/rollers',
  'cocktail',
  'bootstrap_tooltip' // No ref
], function(_, context, log, chatModels, AvatarView, InfiniteScrollMixin, unreadItemsClient,
    Marionette, TroupeViews, appEvents, chatItemView, Rollers, cocktail /* tooltip*/) {
  "use strict";

  /** @const */
  var PAGE_SIZE = 15;

  /*
   * View
   */
  var ChatCollectionView = Marionette.CollectionView.extend({
    itemView: chatItemView.ChatItemView,
    reverseScrolling: true,
    itemViewOptions: function(item) {
      var options = {
        userCollection: this.userCollection,
        decorators: this.decorators
      };

      if(item && item.id) {
        var e = this.$el.find('.model-id-' + item.id)[0];
        if(e) options.el = e;
      }
      return options;
    },
    scrollElementSelector: "#content-frame",

    adjustTopPadding: function() {
      var size = '';
      size = $('#header-wrapper').height()+15 + 'px';
      // this.CCSStylesheetRuleStyle('trp3.css', '.trpChatContainer > div:first-child', 'padding-top', 'size');
          try { 
            document.styleSheets[1].insertRule('.trpChatContainer > div:first-child' + ' {'+'padding-top'+':'+size+'}', document.styleSheets[1].cssRules.length);
          } catch(err) {try { document.styleSheets[1].addRule('.trpChatContainer > div:first-child', 'padding-top'+':'+size)} catch(err) {}}//IE
    },

    initialize: function(options) {
      // this.hasLoaded = false;
      this.adjustTopPadding();
      var self=this;
      var resizer;
      $(window).resize(function(){
        clearTimeout(resizer);
        resizer = setTimeout(self.adjustTopPadding, 100);
      });

      var contentFrame = document.querySelector(this.scrollElementSelector);

      this.rollers = new Rollers(contentFrame);

      /* Since there may be preloaded stuff */
      this.rollers.adjustScroll();

      this.userCollection = options.userCollection;
      this.decorators     = options.decorators || [];

      // CODEDEBT: Move unread-item-tracking into it's own module
      // this.findChatToTrack();

      // this.listenTo(this.collection, 'add reset', function() {
      //   if(this.unreadItemToTrack) return;
      //   this.findChatToTrack();
      // });

      // this.listenTo(this.collection, 'remove', function(e, model) {
      //   if(this.unreadItemToTrack && model === this.unreadItemToTrack) {
      //     this.findChatToTrack();
      //   }
      // });

      // this.listenTo(this.collection, 'change', function() {
      //   if(!this.unreadItemToTrack) return;
      //   if(this.unreadItemToTrack.get('unread')) return;

      //   this.findChatToTrack();
      // });

      /* Scroll to the bottom when the user sends a new chat */
      this.listenTo(appEvents, 'chat.send', function() {
        this.rollers.scrollToBottom();
      });

    },

    scrollToFirstUnread: function() {
      var self = this;

      function findFirstUnread(callback) {
        var firstUnread = self.collection.findWhere({ unread: true });
        if(!firstUnread) {
          self.loadMore();
          self.collection.once('sync', function() {
            findFirstUnread(callback);
          });
        } else {
          callback(firstUnread);
        }
      }

      findFirstUnread(function(firstUnread) {
        var firstUnreadView = self.children.findByModel(firstUnread);
        self.rollers.trackUntil(firstUnreadView.el);
        self.rollers.adjustScrollContinuously(200);
      });

    },

    scrollToBottom: function() {
      this.rollers.scrollToBottom();
    },

    isScrolledToBottom: function() {
      return this.rollers.isScrolledToBottom();
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
      if(this.collection.length === 1) {
        this.adjustTopPadding();
      }

      if(!this._findingNextUnread) return;

      var view = this.children.findByModel(this.unreadItemToTrack);
      if(view) {
        this._findingNextUnread = false;
        this.rollers.trackUntil(view.el);
      }
    },

    getFetchData: function() {
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

      return {
          beforeId: lowestId,
          limit: PAGE_SIZE
      };

    }

  });
  cocktail.mixin(ChatCollectionView, TroupeViews.SortableMarionetteView, InfiniteScrollMixin);

  return ChatCollectionView;
});
