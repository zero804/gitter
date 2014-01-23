/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'backbone',
  'utils/context',
  'hbs!./tmpl/unreadBannerTemplate'
  ], function($, backbone, context, template)  {
  "use strict";

  var BannerView = backbone.View.extend({
    initialize: function(options) {
      this.chatCollectionView = options.chatCollectionView;
      this.listenTo(this.model, 'change:'+this.unreadPropertyName, this.render);
    },
    render: function() {
      var model = this.model;
      var $banner = this.$el;
      var unreadCount = model.get(this.unreadPropertyName);

      $banner.html(template({
        unreadCount: unreadCount,
        isSingleUnread: unreadCount === 1,
        showMarkAllButton: this.showMarkAllButton
      }));
      if(unreadCount > 0) {
        $banner.parent().show();
        setTimeout(function() {
          $banner.removeClass('slide-away');
        }, 0);
      } else {
        $banner.addClass('slide-away');
        setTimeout(function() {
          if(model.get(this.unreadPropertyName) === 0) {
            $banner.parent().hide();
          }
        }, 500);
      }
    },

  });

  var Top = BannerView.extend({
    unreadPropertyName: 'unreadAbove',
    showMarkAllButton: true,
    events: {
      'click .banner-main-button': 'scrollToFirstUnread',
      'click .banner-side-button': 'dismissAll'
    },
    scrollToFirstUnread: function() {
      if(this.model.get('unreadAbove') < 1) return;

      this.chatCollectionView.scrollToFirstUnread();
    },
    dismissAll: function() {
      if(this.model.get('unreadAbove') < 1) return;

      $.ajax({
        url: "/api/v1/troupes/" + context.getTroupeId() + "/unreadItems/all",
        contentType: "application/json",
        type: "DELETE",
      });
    }
  });

  var Bottom = BannerView.extend({
    unreadPropertyName: 'unreadBelow',
    showMarkAllButton: false,
    events: {
      'click .banner-main-button': 'onMainButtonClick',
    },
    onMainButtonClick: function() {
      if(this.model.get('unreadBelow') < 1) return;

      this.chatCollectionView.scrollToBottom();
    }
  });

  return {
    Top: Top,
    Bottom: Bottom
  };

});
