/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'utils/log',
  'components/unread-items-client',
  'marionette',
  'views/base',
  'hbs!./tmpl/chatViewItem'
], function($, _, log, unreadItemsClient, Marionette, TroupeViews, chatItemTemplate) {
  "use strict";

  var PAGE_SIZE = 15;

  var ChatViewItem = TroupeViews.Base.extend({
    unreadItemType: 'chat',
    template: chatItemTemplate,

    events: {
    },

    safe: function(text) {
      return (''+text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\n\r?/g, '<br />');
    },

    getRenderData: function() {
      var data = this.model.toJSON();

      // We need to parse the text a little to hyperlink known links and escape html to prevent injection
      data.text = this.safe(data.text);

      var current = data.fromUser.id == window.troupeContext.user.id;

      data.displayName = data.fromUser.displayName;

      /* TODO: css selectors should be able to handle this from a single class on a parent div */
      if(current) {
        data.chatRowClass = 'trpChatRow';
        data.chatRowPictureClass = 'trpChatPictureLocal';
        data.chatBubbleAdditional = 'local';
      } else {
        data.chatRowClass = 'trpChatRowRemote';
        data.chatRowPictureClass = 'trpChatPictureRemote';
        data.chatBubbleAdditional = 'remote';
      }

      return data;
    }

  });

  //
  // Default Scroll Delegate
  //
  var DefaultScrollDelegate = function($scroller, $container, scrollPosBeforeAdd) {
    this.$scroller = $scroller;
    this.$container = $container;
    this.scrollPosBeforeAdd = scrollPosBeforeAdd;
  };

  DefaultScrollDelegate.prototype.onAfterItemAdded = function() {
    if (this.isAtBottomOfPage) {
      // stay at the bottom
      this.$scroller.scrollTop(this.$container.height());
    } else if (this.firstElBeforeLoad) {
      // keep current position if we are loading more
      // it's very difficult to get an elements co-ordinate within it's parent.
      // so we readjust the scroll according to how much it's parent has grown,
      // to be more general we could look at the displacement that the growth caused for the element,
      // so that we can figure out how much growth occurred above vs below it.
      //log("Resetting scroll from ", this.$scroller.scrollTop(), " to ", this.scrollPosBeforeAdd, " + ", this.$container.height(), " - ", this.containerHeightBeforeAdd, " = ", this.scrollPosBeforeAdd + (this.$container.height() - this.containerHeightBeforeAdd));
      this.$scroller.scrollTop(this.scrollPosBeforeAdd + (this.$container.height() - this.containerHeightBeforeAdd));
      // we store the accumulated scroll position here because safari doesn't update the scroll position immediately, so we can't read it back accurately.
      this.scrollPosBeforeAdd += (this.$container.height() - this.containerHeightBeforeAdd);
    }
  };

  DefaultScrollDelegate.prototype.onBeforeItemAdded = function() {
    this.isAtBottomOfPage = (this.$scroller.scrollTop() >= (this.$container.height() - this.$scroller.height()));
    this.containerHeightBeforeAdd = this.$container.height();
  };

  DefaultScrollDelegate.prototype.onLoadNextMessages = function() {
    // if there are no chat items in the view, don't try save the curOffset
    if (this.$el.find('>').length) {
      // store the chat item view element that is at the top of the list at this point  (before loading)
      this.firstElBeforeLoad = this.$el.find(':first');
      this.scrollPosBeforeAdd = 0;
    }
  };

  var EyesOffScrollDelegate = function($scroller, $container, itemType, scrollPosBeforeAdd) {
    this.$scroller = $scroller;
    this.$container = $container;
    this.itemType = itemType;
    this.scrollPosBeforeAdd = scrollPosBeforeAdd;

    var topUnreadItem = unreadItemsClient.findTopMostVisibleUnreadItem(itemType);
    if(topUnreadItem) {
      this.maxScroll = topUnreadItem.offset().top;
    } else {
      this.maxScroll = -1;
    }
    log('MaxScroll1 ', this.maxScroll);

  };

  EyesOffScrollDelegate.prototype.onAfterItemAdded = function() {
    if(this.maxScroll < 0) {
      var topUnreadItem = unreadItemsClient.findTopMostVisibleUnreadItem(this.itemType);

      if(topUnreadItem) {
        this.maxScroll = topUnreadItem.offset().top;
      }
    }

    //if (this.firstElBeforeLoad) {
      // keep current position if we are loading more
      // it's very difficult to get an elements co-ordinate within it's parent.
      // so we readjust the scroll according to how much it's parent has grown,
      // to be more general we could look at the displacement that the growth caused for the element,
      // so that we can figure out how much growth occurred above vs below it.
      var newTop = this.scrollPosBeforeAdd + (this.$container.height() - this.containerHeightBeforeAdd);

      if(this.maxScroll >= 0) {
        if(newTop > this.maxScroll) newTop = this.maxScroll;
      }

      log('Scroll before add', this.scrollPosBeforeAdd);
      log('Scroll before add', this.scrollPosBeforeAdd);
      log('New scroll is ' + newTop);
      log('Max scroll is ' + this.maxScroll);

      this.$scroller.scrollTop(newTop);

      // we store the accumulated scroll position here because safari doesn't update the scroll position immediately, so we can't read it back accurately.
      this.scrollPosBeforeAdd += (this.$container.height() - this.containerHeightBeforeAdd);
    //}
  };

  EyesOffScrollDelegate.prototype.onBeforeItemAdded = function() {
    this.containerHeightBeforeAdd = this.$container.height();
  };

  EyesOffScrollDelegate.prototype.onLoadNextMessages = function() {
    // if there are no chat items in the view, don't try save the curOffset
    //if (this.$el.find('>').length) {
      // store the chat item view element that is at the top of the list at this point  (before loading)
      //this.firstElBeforeLoad = this.$el.find(':first');
      this.scrollPosBeforeAdd = 0;
    //}
  };


  var ChatCollectionView = Marionette.CollectionView.extend({
    itemView: ChatViewItem,
    chatMessageLimit: PAGE_SIZE,

    initialize: function() {
      _.bindAll(this, 'chatWindowScroll', 'windowBlur', 'windowFocus');
      this.initializeSorting();

      if (window._troupeCompactView) {
        this.$scrollOf = $('#chat-wrapper');
        this.$container = $('#chat-frame');
      } else {
        this.$scrollOf = $(window);
        this.$container = $(document);
      }

      this.scrollDelegate = new DefaultScrollDelegate(this.$scrollOf, this.$container, 0);
      this.$scrollOf.on('scroll', this.chatWindowScroll);

      $(window).on('blur', this.windowBlur);
      $(window).on('focus', this.windowFocus);
    },

    onClose: function(){
      $(window).off('blur', this.windowBlur);
      $(window).off('focus', this.windowFocus);
    },

    windowBlur: function() {
      log('EyesOff');
      //this.scrollDelegate = new EyesOffScrollDelegate(this.$scrollOf, this.$container, this.collection.modelName, this.scrollDelegate.scrollPosBeforeAdd);
    },

    windowFocus: function() {
      log('EyesOn');
      this.scrollDelegate = new DefaultScrollDelegate(this.$scrollOf, this.$container, this.scrollDelegate.scrollPosBeforeAdd);
    },

    beforeClose: function() {
      this.$scrollOf.off('scroll', this.chatWindowScroll);
    },

    onRender: function() {
      // log("scrollOf scroll: " + this.$scrollOf.scrollTop() + " container height: " + this.$container.height());
      // this is an ugly hack to deal with some weird timing issues
      var self = this;
      setTimeout(function() {
        $(self.scrollOf).scrollTop($(self.container).height());
      }, 500);
    },

    onAfterItemAdded: function() {
      this.scrollDelegate.onAfterItemAdded();
    },

    onBeforeItemAdded: function() {
      this.scrollDelegate.onBeforeItemAdded();
    },

    chatWindowScroll: function() {
      if (this.hasScrolled && this.$scrollOf.scrollTop() === 0) {
        this.loadNextMessages();
      }
      this.hasScrolled = true;
    },

    loadNextMessages: function() {
      if(this.loading) return;

      this.scrollDelegate.onLoadNextMessages();

      var self = this;
      this.loading = true;
      function success(data, resp) {
        self.loading = false;
        if(!resp.length) {
          $(self.scrollOf).off('scroll', self.chatWindowScroll);
        }
      }

      function error() {
        self.loading = false;
      }

      this.collection.fetch({
        update: true,
        add: true,
        remove: false, // chat messages are never deleted
        data: {
          skip: this.collection.length,
          limit: this.chatMessageLimit
        },
        success: success,
        error: error
      });

    }

  });

  _.extend(ChatCollectionView.prototype, TroupeViews.SortableMarionetteView);

  return ChatCollectionView;
});
