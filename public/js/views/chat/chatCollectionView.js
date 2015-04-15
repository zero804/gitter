"use strict";
var $ = require('jquery');
var _ = require('underscore');
var log = require('utils/log');
var Marionette = require('marionette');
var TroupeViews = require('views/base');
var appEvents = require('utils/appevents');
var chatItemView = require('./chatItemView');
var Rollers = require('utils/rollers');
var cocktail = require('cocktail');
require('views/behaviors/infinite-scroll');

module.exports = (function() {

  function isFirstElementInParent(element) {
    var prev = element.previousSibling;
    if (!prev) return true;
    return prev.nodeType === 3 /* TEXT */ && !prev.previousSibling && prev.textContent.match(/^[\s\n\r]*$/); /* Whitespace */
  }

  function isLastElementInParent(element) {
    var next = element.nextSibling;
    if (!next) return true;
    return next.nodeType === 3 /* TEXT */ && !next.nextSibling && next.textContent.match(/^[\s\n\r]*$/); /* Whitespace */
  }

  function isAtStartOfParent(parent, element) {
    while (isFirstElementInParent(element) && element !== parent) element = element.parentElement;
    return element === parent;
  }

  function isAtEndOfParent(parent, element) {
    while (isLastElementInParent(element) && element !== parent) element = element.parentElement;
    return element === parent;
  }

  /** @const */
  var PAGE_SIZE = 100;

  var SCROLL_ELEMENT = "#content-frame";

  function getModelsInRange(collectionView, startElement, endElement) {
    var models = [];
    var i = 0;
    var child, children = collectionView.children;

    /* Find the start element */
    while(i < children.length) {
      child = children.findByIndex(i);
      if (child.el === startElement) {
        break;
      }
      i++;
    }

    /* Find the end element */
    while(i < children.length) {
      child = children.findByIndex(i);
      models.push(child.model);
      if (child.el === endElement) {
        return models;
      }
      i++;
    }
    /* Didn't find the end */
    return [];
  }

  function renderMarkdown(models) {
    var text = models.map(function(model) {
      var text;

      if (models.length > 1 && model.get('burstStart')) {
        var user = model.get('fromUser');
        var username = user && user.username;
        if (username) username = "@" + username;
        text = username + '\n' + model.get('text');
      } else {
        text = model.get('text');
      }
      if (!text) return '';
      if (text.charAt(text.length - 1) !== '\n') text = text + '\n';
      return text;
    }).join('');

    if (text.charAt(text.length -1) === '\n') return text.substring(0, text.length - 1);

    return text;
  }

  /*
   * View
   */
  var ChatCollectionView = Marionette.CollectionView.extend({

    behaviors: {
      InfiniteScroll: {
        reverseScrolling: true,
        scrollElementSelector: SCROLL_ELEMENT,
        contentWrapper: '#chat-container'
      }
    },

    events: {
      "copy": "onCopy"
    },

    itemView: chatItemView.ChatItemView,

    itemViewOptions: function(item) {
      var options = {
        userCollection: this.userCollection,
        decorators: this.decorators,
        rollers: this.rollers
      };

      if(item && item.id) {
        // This allows the chat collection view to bind to an existing element...
        var e = this.$el.find('.model-id-' + item.id)[0];
        if(e) options.el = e;
      }
      return options;
    },


    // This nasty thing changes the CSS rule for the first chat item to prevent a high headerView from covering it
    // We do this instead of jQuery because the first-child selector can
    adjustTopPadding: function() {
      var size = $('#header-wrapper').outerHeight() + 'px';
      var ss = document.styleSheets[2];
      try {
        if (ss.insertRule) {
          ss.insertRule('.trpChatContainer > div:first-child { padding-top: ' + size + ' }', ss.cssRules.length);
        } else if (ss.addRule) {
          ss.addRule('.trpChatContainer > div:first-child', 'padding-top:' + size);
        }
      } catch (err) {
        // TODO: Handle the error? WC.
      }
    },

    initialize: function(options) {
      // this.hasLoaded = false;
      this.adjustTopPadding();
      var self = this;
      var resizer;

      $(window).resize(function(){
        clearTimeout(resizer);
        resizer = setTimeout(self.adjustTopPadding, 100);
      });

      this.listenTo(appEvents, 'chatCollectionView:scrollToBottom', function() {
        this.collection.fetchLatest({}, function () {
          this.rollers.scrollToBottom();
          this.clearHighlight();
        }, this);
      });

      this.listenTo(appEvents, 'chatCollectionView:selectedChat', function (id, opts) {
        var model = this.collection.get(id);

        // clearing previously highlighted chat.
        this.clearHighlight();

        if (!model) return;

        // highlighting new and replacing "current"
        this.highlightChat(model, opts.highlights);
        this.highlighted = model;

        // finally scroll to it
        this.scrollToChatId(model);
      });

      this.listenTo(appEvents, 'chatCollectionView:clearHighlight', this.clearHighlight.bind(this));

      var contentFrame = document.querySelector(SCROLL_ELEMENT);
      this.rollers = new Rollers(contentFrame, this.el);

      this.userCollection = options.userCollection;
      this.decorators     = options.decorators || [];

      /* Scroll to the bottom when the user sends a new chat */
      this.listenTo(appEvents, 'chat.send', function() {
        this.rollers.scrollToBottom();
        this.collection.fetchLatest({}, function() {
        }, this);
      });

      this.listenTo(this.collection, 'fetch.started', function() {
        this.rollers.stable();
        this.rollers.setModeLocked(true);
      });

      this.listenTo(this.collection, 'fetch.completed', function() {
        this.rollers.setModeLocked(false);
      });

      this.listenTo(appEvents, 'command.collapse.chat', this.collapseChats);
      this.listenTo(appEvents, 'command.expand.chat', this.expandChats);
    },

    scrollToFirstUnread: function() {
      var self = this;
      this.collection.fetchFromMarker('first-unread', {}, function() {
        var firstUnread = self.collection.findWhere({ unread: true });
        if(!firstUnread) return;
        var firstUnreadView = self.children.findByModel(firstUnread);
        if(!firstUnreadView) return;
        self.rollers.scrollToElement(firstUnreadView.el);
      });

    },

    scrollToFirstUnreadBelow: function() {
      var contentFrame = document.querySelector(SCROLL_ELEMENT);

      var unreadItems = contentFrame.querySelectorAll('.unread');
      var viewportBottom = this.rollers.getScrollBottom() + 1;
      var firstOffscreenElement = _.sortedIndex(unreadItems, viewportBottom, function(element) {
        return element.offsetTop;
      });

      var element = unreadItems[firstOffscreenElement];
      if(element) {
        this.rollers.scrollToElement(element);
      }
    },

    scrollToBottom: function() {
      this.rollers.scrollToBottom();
    },

    isScrolledToBottom: function() {
      return this.rollers.isScrolledToBottom();
    },

    onAfterItemAdded: function() {
      if(this.collection.length === 1) {
        this.adjustTopPadding();
      }
    },

    pageUp: function() {
      var scrollFromTop = this.$el.scrollTop();
      var pageHeight = Math.floor(this.$el.height() * 0.8);
      this.$el.scrollTop(scrollFromTop - pageHeight);

      // page up doesnt trigger scroll events
      if(scrollFromTop === 0) {
        this.scroll.trigger('approaching.end');
      }
    },

    pageDown: function() {
      var scrollFromTop = this.$el.scrollTop();
      var pageHeight = Math.floor(this.$el.height() * 0.8);
      this.$el.scrollTop(scrollFromTop + pageHeight);
    },

    scrollToChat: function (chat) {
      var view = this.children.findByModel(chat);
      if (!view) return;
      this.rollers.scrollToElement(view.el, { centre: true });
      return true;
    },

    scrollToChatId: function (id) {
      var model = this.collection.get(id);
      if (!model) return;
      this.scrollToChat(model);
    },

    // used to highlight and "dim" chat messages, the behaviour Highlight responds to these changes.
    // to "dim" simply leave out the arr argument
    highlightChat: function (model, arr) {
      model.set('highlights', arr || []);
    },

    clearHighlight: function () {
      var old = this.highlighted;
      if (!old) return;
      try {
        this.highlightChat(old);
      } catch (e) {
        log.info('Could not clear previously highlighted item');
      }
    },

    getFetchData: function() {
      log.info("Loading next message chunk.");

      var ids = this.collection.map(function(m) { return m.get('id'); });
      var lowestId = _.min(ids, function(a, b) {
        if(a < b) return -1;
        if(a > b) return 1;
        return 0;
      });

      if (lowestId === Infinity) {
        log.info('No messages loaded, cancelling pagenation (!!)');
        return;
      }

      return {
        beforeId: lowestId,
        limit: PAGE_SIZE
      };
    },

    findLastCollapsibleChat: function() {
      var c = this.collection;
      for(var i = c.length - 1; i >= 0; i--) {
        var m = c.at(i);
        if(m.get('isCollapsible')) {
          return m;
        }
      }
    },

    setLastCollapsibleChat: function(state) {
      var last = this.findLastCollapsibleChat();
      if(!last) return;
      var chatItem = this.children.findByModel(last);
      if(chatItem) chatItem.setCollapse(state);
    },

    /* Collapses the most recent chat with embedded media */
    collapseChats: function() {
      this.setLastCollapsibleChat(true);
    },

    /* Expands the most recent chat with embedded media */
    expandChats: function() {
      this.setLastCollapsibleChat(false);
    },

    onCopy: function(e) {
      if (!window.getSelection /* ios8 */) return;

      if (e.originalEvent) e = e.originalEvent;

      var selection = window.getSelection();
      if (!selection || !selection.rangeCount || !selection.getRangeAt) {
        /* Just use the default */
        return;
      }

      var range = selection.getRangeAt(0);
      var plainText ='' + selection;

      var start = $(range.startContainer).parents('.chat-item')[0];
      var end = $(range.endContainer).parents('.chat-item')[0];
      if (!start || !end) {
        /* Selection outside of chat items */
        return;
      }

      var startText = $(range.startContainer).parents('.js-chat-item-text')[0];
      var endText = $(range.endContainer).parents('.js-chat-item-text')[0];

      /* Has a single chat been selected? If so, only use markdown if the WHOLE chat has been selected, and not a partial selection */
      if (startText && endText && startText === endText) {
        /* Partial selection */
        if(range.startOffset > 0 || range.endOffset < range.endContainer.textContent.length) return;

        var atStart = isAtStartOfParent(startText, range.startContainer);
        var atEnd = isAtEndOfParent(startText, range.endContainer);
        if (!atStart || !atEnd) return;
      }

      var models = getModelsInRange(this, start, end);

      /* If the offset is the end of the start container */
      if (range.startContainer.textContent.length && range.startContainer.textContent.length === range.startOffset) models.shift();

      /* ... or the beginning of the end container */
      if (range.endOffset === 0) models.pop();

      /* Nothing to render?*/
      if (!models.length) return;

      var text = renderMarkdown(models);
      e.clipboardData.setData('text/plain', plainText);
      e.clipboardData.setData('text/x-markdown', text);
      e.preventDefault();
    },

  });
  cocktail.mixin(ChatCollectionView, TroupeViews.SortableMarionetteView);

  return ChatCollectionView;

})();
