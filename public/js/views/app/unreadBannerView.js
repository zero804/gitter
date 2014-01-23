/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'backbone',
  'utils/context',
  'hbs!./tmpl/unreadBannerTemplate'
  ], function($, backbone, context, template)  {
  "use strict";

  var Top = backbone.View.extend({
    events: {
      'click .banner-main-button': 'scrollToFirstUnread',
      'click .banner-side-button': 'dismissAll'
    },
    initialize: function(options) {
      this.chatCollectionView = options.chatCollectionView;
      this.listenTo(this.model, 'change:unreadAbove', this.render);
    },
    render: function() {
      var model = this.model;
      var $banner = this.$el;
      var unreadCount = model.get('unreadAbove');

      $banner.html(template({
        unreadCount: unreadCount,
        isSingleUnread: unreadCount === 1,
        showMarkAllButton: true
      }));
      if(unreadCount > 0) {
        $banner.removeClass('slide-away');
      } else {
        $banner.addClass('slide-away');
      }
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

  var Bottom = backbone.View.extend({
    events: {
      'click .banner-main-button': 'onMainButtonClick',
    },
    initialize: function(options) {
      this.chatCollectionView = options.chatCollectionView;
      this.listenTo(this.model, 'change:unreadBelow', this.render);
    },
    render: function() {
      var model = this.model;
      var $banner = this.$el;
      var unreadCount = model.get('unreadBelow');

      $banner.html(template({
        unreadCount: unreadCount,
        isSingleUnread: unreadCount === 1,
        showMarkAllButton: false
      }));
      if(unreadCount > 0) {
        // dont try and show the banner immediately
        setTimeout(function() {
          if(model.get('unreadBelow') > 0) {
            $banner.show();
            $banner.animate({height: 35, top: -35},{queue: false, duration: 500});
          }
        }, 500);

      } else {
        $banner.animate({height: 0, bottom: 0}, {queue: false, duration: 500, complete: function() {
          if(model.get('unreadBelow') < 1) {
            $banner.hide();
          }
        }});

      }
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
