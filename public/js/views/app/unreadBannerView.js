"use strict";
var $ = require('jquery');
var Backbone = require('backbone');
var context = require('utils/context');
var template = require('./tmpl/unreadBannerTemplate.hbs');
var unreadItemsClient = require('components/unread-items-client');

module.exports = (function() {


  var BottomBannerView = Backbone.View.extend({
    events: {
      'click button.main': 'onMainButtonClick'
    },
    initialize: function(options) {
      this.chatCollectionView = options.chatCollectionView;
      this.listenTo(this.model, 'change:unreadBelow', this.render);
    },
    render: function() {
      if(this.getUnreadCount() > 0 && !this.chatCollectionView.isScrolledToBottom()) {
        this.showBanner();
      } else {
        this.hideBanner();
      }
    },
    getUnreadCount: function() {
      return this.model.get('unreadBelow');
    },
    showBanner: function() {
      var $banner = this.$el;
      var unreadCount = this.getUnreadCount();
      var message;
      if(unreadCount === 1) {
        message = '1 unread message';
      } else if(unreadCount > 99) {
        message = '99+ unread messages';
      } else {
        message = unreadCount +' unread messages';
      }

      $banner.html(template({message: message}));
      $banner.parent().show();

      // cant have slide away animation on the same render as a display:none change
      setTimeout(function() {
        $banner.removeClass('slide-away');
      }, 0);
    },
    hideBanner: function() {
      var $banner = this.$el;
      var self = this;

      $banner.addClass('slide-away');

      setTimeout(function() {
        if(self.getUnreadCount() === 0) {
          $banner.parent().hide();
        }
      }, 500);
    },
    onMainButtonClick: function() {
      if(this.getUnreadCount() < 1) return;

      this.chatCollectionView.scrollToFirstUnreadBelow();
    }
  });

  var TopBannerView = BottomBannerView.extend({
    events: {
      'click button.main': 'onMainButtonClick',
      'click button.side': 'onSideButtonClick'
    },
    initialize: function(options) {
      this.chatCollectionView = options.chatCollectionView;
      this.listenTo(this.model, 'change:unreadAbove', this.render);
    },
    render: function() {
      if(this.getUnreadCount() > 0) {
        this.showBanner();
      } else {
        this.hideBanner();
      }
    },
    getUnreadCount: function() {
      return this.model.get('unreadAbove');
    },
    onMainButtonClick: function() {
      if(this.getUnreadCount() < 1) return;

      this.chatCollectionView.scrollToFirstUnread();
    },
    onSideButtonClick: function() {
      unreadItemsClient.markAllRead();
    }
  });

  return {
    Top: TopBannerView,
    Bottom: BottomBannerView
  };


})();

