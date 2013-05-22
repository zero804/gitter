/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'log!scroll-delegate'
], function($, _, log) {
  "use strict";

  /*
  * Default browser scroll behaviour:
  *   When an element is added to the bottom of a container the browser does not scroll the container, it keeps the current content in view and the new message is below the fold.
  *   When an element is added to the top of a container the browser does not scroll the container, and it does NOT keep the current content in view, the original content will be lower (it's displaced), and the new content may be visible.
  *
  * Desired chat collection scroll behaviour:
  *   When a message is added to either the top or bottom, and the viewer is at the bottom of the screen, the scroll should "stay" at the NEW bottom of the screen.
  *   When a subsequent message is added to the bottom, no scrolling is needed (unless the viewer is already at the bottom of the page).
  *   When a chunk of older messages are loaded at the top, the current items in view must stay in view.
  *   When the window is not in focus, subsequent (unread) messages at the bottom must not cause the top most unread item to be scrolled above the fold.
  *
  * When testing eyeball related code during dev use a timer on the second window so that eyeballs isn't triggered when switching between windows (var i = setInterval(function() { window._troupeDebug.app.collections.chats.create({ fromUser: window.troupeContext.user, text: new Date() }); }, 5000);)
  */

  var DefaultScrollDelegate = function($scrollOf, $container, itemType, findTopMostUnreadItem) {
    // the container is used to calculate how much space has been added with a new view element,
    // it is effectively the box that is being scrolled, except the scroll bars will actually be on $scrollOf
    this.$container = $container;
    // the element whose scroll position is manipulated
    this.$scrollOf = $scrollOf;
    // the itemType is used to lookup the unread items, which will not be scrolled off the screen
    this.itemType = itemType;
    // we store the current scroll position because safari doesn't update it immediately so we can't read it back
    this.currentScroll = this.$scrollOf.scrollTop();
    // if maxScroll is > -1 the scroll will not go below this point
    this.maxScroll = -1;
    // switch the max limit functionality on / off so the top unread message is not searched for
    this.useMax = true;
    //
    this.findTopMostUnreadItem = findTopMostUnreadItem;
  };

  DefaultScrollDelegate.prototype.useLimit = function(useMax) {
    // note: eyeball state makes no difference to the unread item limit behaviour, the behavior should always be switched on, because it only ever comes into play when eyeballs are off anyway.
    this.useMax = useMax;
    if (!this.useMax) {
      this.maxScroll = -1;
    }
  };

  DefaultScrollDelegate.prototype.calculateScrollLimit = function() {
    // note: mobile will never have a scroll limit because eyaballs are never off, so items are marked as read immediately.
    if(this.useMax) {
      // look for the highest unread item and set the max to it
      var topUnreadItemPosition = this.findTopMostUnreadItem(this.itemType);

      if(topUnreadItemPosition) {
        // log('Found our top item at position ', topUnreadItemPosition);
        this.maxScroll = Math.max(0, topUnreadItemPosition - 140);
      }
    }
  };

  DefaultScrollDelegate.prototype.onAfterItemAdded = function(/* item */) {

    // stay at the bottom
    if (this.isAtBottomOfPage) {
      return this.scrollToBottom();
    }
    /*
    else {
      we could try keep previous scroll position here, but that might be tricky,
      so we only call onAfterItemAdded for new message (not while loading) and use the collection sync event instead to reset to the bottom after initial load
    }
    */
  };

  DefaultScrollDelegate.prototype.onBeforeItemAdded = function() {
    var scrollTop = this.$scrollOf.scrollTop();
    var containerHeight = this.$container.height();
    var scrollOfHeight = this.$scrollOf.height();
    this.isAtBottomOfPage = (scrollTop >= ((containerHeight - scrollOfHeight) - 40));
    this.containerHeightBeforeAdd = containerHeight;
  };

  DefaultScrollDelegate.prototype.scrollTop = function(top) {
    var scrollToMe = top; // Math.min(top, this.maxScrollPossible()); // disabling usage of maxPossibleScroll because it's not really needed and doesn't yet account for padding or rounding.

    this.calculateScrollLimit();
    if (this.maxScroll >= 0 && top > this.maxScroll) {
      // log("Capping the scroll to " + this.maxScroll + "(" + top + " requested)");
      scrollToMe = this.maxScroll; // Math.min(this.maxScroll, top);
    }

    this.$scrollOf.scrollTop(scrollToMe);
    // we store the accumulated scroll position here because safari doesn't update the scroll position immediately, so we can't read it back accurately.
    this.currentScroll = Math.min(scrollToMe, this.maxScrollPossible());
    //log("Scroll position is now: " + this.$scrollOf.scrollTop() + " (requested " + top + ") of max possible: " + this.maxScrollPossible() + " and max limit: " + this.maxScroll);
  };

  DefaultScrollDelegate.prototype.scrollToBottom = function() {
    // log("Keeping scroll at the bottom of the page (i.e scrolling to new message).", this.$container.height());
    this.scrollTop(this.$container.height());
  };

  DefaultScrollDelegate.prototype.maxScrollPossible = function() {
    // log("Max possible scroll is ", this.$container.height(), this.$scrollOf.height(), (this.$container.height() - this.$scrollOf.height()));
    // TODO need to add on the padding of scrollOf (not included in height()) and parents of scrollOf until container. Also, it seems the browser uses floats for height but jq rounds down to an int.
    return Math.max(0, this.$container.height() - this.$scrollOf.height() + 10);
  };

  /*
  This is in a separate class to DefaultScrollDelegate because it keeps track of the container heights for a chunk instead of for each item.
  */
  var InfiniteScrollDelegate = function() {
    DefaultScrollDelegate.apply(this, arguments);
    // ?
    this.scrollPosBeforeChunkAdd = 0;
  };

  _.extend(InfiniteScrollDelegate.prototype, DefaultScrollDelegate.prototype, {

    beforeLoadNextMessages: function() {
      // we want to keep the current items still on the page when a new block of messages are loaded.
      // scroll position is always at 0 before loading new messages (because they are loaded when scrolling to the top of the page).
      // because this counter is reset before the load, it doesn't matter if we don't know when the load is complete.
      // in fact, seen as this counter is used in all scroll calculations, it is necessary to not reset or finish incrementing it when the load is complete.
      this.scrollPosBeforeChunkAdd = 0;
      this.onBeforeItemAdded();
    },

    afterLoadNextMessages: function() {
      this.scrollToPreviousPosition();
    },

    scrollToPreviousPosition: function() {
      // log("Scrolling to keep current content in view.", this.scrollPosBeforeChunkAdd, this.currentScroll, (this.$container.height() - this.containerHeightBeforeAdd));
      // re-adjust the scroll according to how much the container has grown (to be more general we could look at the displacement that the growth caused for the element, so that we can figure out how much growth occurred above vs below it)
      // keep track of how much space has been used since the last call to load new messages
      this.scrollTop(this.scrollPosBeforeChunkAdd += (this.$container.height() - this.containerHeightBeforeAdd));
    }

  });

  return {
    DefaultScrollDelegate: DefaultScrollDelegate,
    InfiniteScrollDelegate: InfiniteScrollDelegate
  };

});