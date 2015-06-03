"use strict";

var Marionette = require('backbone.marionette');
var template = require('./tmpl/unreadBannerTemplate.hbs');
var appEvents = require('utils/appevents');
var unreadItemsClient = require('components/unread-items-client');

var TopBannerView = Marionette.ItemView.extend({
  octicon: 'octicon-chevron-up',
  template: template,
  hidden: true,
  ui: {
    bannerMessage: '#banner-message',
    buttons: 'button'
  },
  //className: 'banner slide-away',
  className: 'banner-wrapper',
  events: {
    'click button.main': 'onMainButtonClick',
    'click button.side': 'onSideButtonClick'
  },

  // TODO all other change events for mentions
  modelEvents: {
    'change:unreadAbove': 'updateVisibility',
    'change:hasUnreadAbove': 'updateVisibility',
    'change:hasMentionsAbove': 'updateVisibility'
  },

  hasMentions: function() {
    return (this.model.get('mentionsAbove') > 0);
  },

  highlightIfHasMentions: function() {
    if (this.hasMentions()) {
      this.ui.buttons.addClass('mention');
    } else {
      this.ui.buttons.removeClass('mention');
    }
  },

  getUnreadCount: function() {
    return this.model.get('unreadAbove');
  },

  getMentionsCount: function() {
    return this.model.get('mentionsAbove');
  },

  serializeData: function() {
    return { message: this.getMessage(), octicon: this.octicon };
  },

  getMessage: function() {
    var unreadCount = this.getUnreadCount();
    var mentionsCount = this.getMentionsCount();

    if(!unreadCount) {
      return 'No unread messages';
    }

    if (mentionsCount === 1) {
      return ' 1 mention';
    }

    if (mentionsCount > 1) {
      return ' ' + mentionsCount + '  mentions';
    }


    if(unreadCount === 1) {
      return ' 1 unread';
    }

    if(unreadCount > 99) {
      return ' 99+ unread';
    }

    return ' ' + unreadCount + ' unread';
  },

  //getVisible: function() {
  //  return !!this.model.get('hasUnreadAbove');
  //},

  shouldBeVisible: function() {
    return (this.model.get('hasUnreadAbove') && this.model.get('hasMentionsAbove'));
  },

  updateMessage: function() {
    var noMoreItems = !this.getUnreadCount();
    if (noMoreItems) return; // Don't change the text as it slides down as it's distracting
    this.ui.bannerMessage.text(this.getMessage());
  },

  updateVisibility: function() {

    this.highlightIfHasMentions();
    this.updateMessage();

    //var requiredVisiblity = this.getVisible();
    //var visible = !this.hidden;
    //if (requiredVisiblity === visible) return; // Nothing to do here

    if (this.shouldBeVisible() && !this.hidden) return;

    if (!this.hidden) {
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
    this.updateVisibility();
  },

  onMainButtonClick: function() {
    //appEvents.trigger('chatCollectionView:scrollToFirstUnread');
    var itemId = this.model.get('oldestUnreadItemId');
    if (itemId) appEvents.trigger('chatCollectionView:scrollToChatId', itemId);
  },

  onSideButtonClick: function() {
    unreadItemsClient.markAllRead();
  }
});

var BottomBannerView = TopBannerView.extend({
  octicon: 'octicon-chevron-down',

  className: 'banner-wrapper bottom',

  modelEvents: {
    'change:unreadBelow': 'updateVisibility',
    'change:hasUnreadBelow': 'updateVisibility',
    'change:hasMentionsBelow': 'updateVisibility'
  },

  shouldBeVisible: function() {
    return (this.model.get('hasUnreadBelow') && this.model.get('hasMentionsBelow'));
  },

  hasMentions: function() {
    return (this.model.get('mentionsBelow') > 0);
  },

  getUnreadCount: function() {
    return this.model.get('unreadBelow');
  },

  getMentionsCount: function() {
    return this.model.get('mentionsBelow');
  },

  //getVisible: function() {
  //  return !!this.model.get('hasUnreadBelow');
  //},

  onMainButtonClick: function() {
    var mentionId = this.model.get('mostRecentMentionId');
    if (mentionId) return appEvents.trigger('chatCollectionView:scrollToChatId', mentionId);

    var itemId = this.model.get('mostRecentUnreadItemId');
    if (itemId) return appEvents.trigger('chatCollectionView:scrollToChatId', itemId);
  },

  onSideButtonClick: function() {
  }

});

module.exports = {
  Top: TopBannerView,
  Bottom: BottomBannerView
};
