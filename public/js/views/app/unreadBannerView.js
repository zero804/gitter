"use strict";

var Marionette = require('backbone.marionette');
var template = require('./tmpl/unreadBannerTemplate.hbs');
var appEvents = require('utils/appevents');
var unreadItemsClient = require('components/unread-items-client');

var TopBannerView = Marionette.ItemView.extend({
  arrowChar: '￪',
  template: template,
  hidden: true,
  ui: {
    bannerMessage: '#banner-message',
    buttons: 'button'
  },
  className: 'banner slide-away',
  events: {
    'click button.main': 'onMainButtonClick',
    'click button.side': 'onSideButtonClick'
  },
  modelEvents: {
    'change:unreadAbove': 'updateDisplay',
    'change:hasUnreadAbove': 'updateVisibility'
  },
  getUnreadCount: function() {
    return this.model.get('unreadAbove');
  },

  serializeData: function() {
    return { message: this.getMessage() };
  },

  getMessage: function() {
    var unreadCount = this.getUnreadCount();

    if(!unreadCount) {
      return 'No unread messages';
    }

    if(unreadCount === 1) {
      return this.arrowChar + ' 1 unread message';
    }

    if(unreadCount > 99) {
      return this.arrowChar + '99+ unread messages';
    }

    return this.arrowChar + ' ' + unreadCount + ' unread messages';
  },

  getVisible: function() {
    return !!this.model.get('hasUnreadAbove');
  },

  updateDisplay: function() {
    var noMoreItems = !this.getUnreadCount();
    if (noMoreItems) return; // Don't change the text as it slides down as it's distracting
    this.ui.bannerMessage.text(this.getMessage());
  },

  updateVisibility: function() {
    var requiredVisiblity = this.getVisible();
    var visible = !this.hidden;
    if (requiredVisiblity === visible) return; // Nothing to do here
    if (visible) {
      // Hide
      this.$el.addClass('slide-away');

      this.ui.buttons.blur();
      if (this.hideTimeout) return;

      this.hideTimeout = setTimeout(function() {
        delete this.hideTimeout;
        this.hidden = true;
        this.$el.parent().hide();
      }.bind(this), 500);

    } else {
      // Show
      this.$el.parent().show();
      this.$el.removeClass('slide-away');
      this.hidden = false;
      if (this.hideTimeout) {
        clearTimeout(this.hideTimeout);
        delete this.hideTimeout;
      }
    }
  },

  onRender: function() {
    this.updateDisplay();
  },

  onMainButtonClick: function() {
    appEvents.trigger('chatCollectionView:scrollToFirstUnread');
  },

  onSideButtonClick: function() {
    unreadItemsClient.markAllRead();
  }
});

var BottomBannerView = TopBannerView.extend({
  arrowChar: '￬',
  modelEvents: {
    'change:unreadBelow': 'updateDisplay',
    'change:hasUnreadBelow': 'updateVisibility'
  },
  getUnreadCount: function() {
    return this.model.get('unreadBelow');
  },

  getVisible: function() {
    return !!this.model.get('hasUnreadBelow');
  },

  onMainButtonClick: function() {
    var belowItemId = this.model.get('belowItemId');
    if (belowItemId) {
      appEvents.trigger('chatCollectionView:scrollToChatId', belowItemId);
    }
  },

  onSideButtonClick: function() {
  }

});

module.exports = {
  Top: TopBannerView,
  Bottom: BottomBannerView
};
