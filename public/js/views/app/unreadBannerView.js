/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'backbone',
  'utils/context',
  'utils/appevents',
  'hbs!./tmpl/unreadBannerTemplate'
  ], function($, backbone, context, appEvents, template)  {
  "use strict";

  function getNewUnreadMessageCount(chatCollection) {
    var messages = chatCollection.models;
    var count = 0;
    while(messages[messages.length - (1+count)].get('unread')) {
      count++;
    }
    return count;
  }

  var UnreadModel = backbone.Model.extend({
    defaults: {
      unreadCount: 0,
      unreadAbove: 0,
      unreadBelow: 0
    },
    initialize: function(options) {
      this.listenTo(appEvents, 'unreadItemsCount', function(count) {
        var newMessageCount = getNewUnreadMessageCount(options.chatCollection);
        this.set('unreadCount', count);
        this.set('unreadBelow', newMessageCount);
        this.set('unreadAbove', count - newMessageCount);
      }, this);
    }
  });

  return backbone.View.extend({
    events: {
      'click .banner-main-button': 'scrollToFirstUnread',
      'click .banner-side-button': 'dismissAll'
    },
    initialize: function(options) {
      this.chatCollectionView = options.chatCollectionView;
      var chatCollection = options.chatCollection;
      this.model = new UnreadModel({chatCollection: chatCollection});
      this.listenTo(this.model, 'change', this.render);
    },
    render: function() {
      var model = this.model;
      var $banner = this.$el;
      var unreadCount = model.get('unreadCount');

      $banner.html(template({
        unreadCount: unreadCount,
        isSingleUnread: unreadCount === 1
      }));
      if(unreadCount > 0) {
        // dont try and show the banner immediately
        setTimeout(function() {
          if(model.get('unreadCount') > 0) {
            $banner.show();
            $banner.animate({height: 35, bottom: -35},{queue: false, duration: 500});
          }
        }, 500);

      } else {
        $banner.animate({height: 0, bottom: 0}, {queue: false, duration: 500, complete: function() {
          if(model.get('unreadCount') < 1) {
            $banner.hide();
          }
        }});

      }
    },
    scrollToFirstUnread: function() {
      if(this.model.get('unreadCount') < 1) return;

      this.chatCollectionView.scrollToFirstUnread();
    },
    dismissAll: function() {
      if(this.model.get('unreadCount') < 1) return;

      $.ajax({
        url: "/api/v1/troupes/" + context.getTroupeId() + "/unreadItems/all",
        contentType: "application/json",
        type: "DELETE",
      });
    }
  });

});
