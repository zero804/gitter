"use strict";

var Marionette = require('backbone.marionette');
var template = require('./tmpl/unreadBannerTemplate.hbs');
var appEvents = require('utils/appevents');
var unreadItemsClient = require('components/unread-items-client');

var TopBannerView = Marionette.ItemView.extend({
  template: template,
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
    'change:unreadAbove': 'updateDisplay'
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
      return '1 unread message';
    }

    if(unreadCount > 99) {
      return '99+ unread messages';
    }

    return unreadCount + ' unread messages';
  },

  updateDisplay: function() {
    var noMoreItems = !this.getUnreadCount();
    if (noMoreItems) {
      this.ui.buttons.blur();
    }
    this.$el.toggleClass('slide-away', noMoreItems);
    this.ui.bannerMessage.text(this.getMessage());
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
  modelEvents: {
    'change:unreadBelow': 'updateDisplay'
  },
  getUnreadCount: function() {
    return this.model.get('unreadBelow');
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
