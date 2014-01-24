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
      var self = this;
      var model = this.model;
      var $banner = this.$el;
      var unreadCount = model.get(this.unreadPropertyName);

      if(unreadCount > 0) {
        var message = (unreadCount > 1) ? unreadCount+' unread messages' : '1 unread message';
        $banner.html(template({
          message: message,
          showMarkAllButton: this.showMarkAllButton
        }));
        $banner.parent().show();
        setTimeout(function() {
          $banner.removeClass('slide-away');
        }, 0);
      } else {
        $banner.addClass('slide-away');
        setTimeout(function() {
          if(model.get(self.unreadPropertyName) === 0) {
            $banner.parent().hide();
          }
        }, 500);
      }
    }

  });

  var Top = BannerView.extend({
    unreadPropertyName: 'unreadAbove',
    showMarkAllButton: true,
    events: {
      'click button.main': 'scrollToFirstUnread',
      'click button.side': 'dismissAll'
    },
    scrollToFirstUnread: function() {
      if(this.model.get('unreadAbove') < 1) return;

      this.chatCollectionView.scrollToFirstUnread();
    },
    dismissAll: function() {
      if(this.model.get('unreadAbove') < 1) return;

      $.ajax({
        url: "/api/v1/troupes/" + context.getTroupeId() + "/unreadItems/all",
        data: "",
        type: "DELETE",
      });
    }
  });

  var Bottom = BannerView.extend({
    unreadPropertyName: 'unreadBelow',
    showMarkAllButton: false,
    events: {
      'click button.main': 'onMainButtonClick',
    },
    render: function() {
      var self = this;
      var model = this.model;
      var $banner = this.$el;
      var unreadCount = model.get(this.unreadPropertyName);

      if(unreadCount > 0 && !this.chatCollectionView.isScrolledToBottom()) {
        var message = (unreadCount > 1) ? unreadCount+' unread messages' : '1 unread message';
        $banner.html(template({
          message: message,
          showMarkAllButton: this.showMarkAllButton
        }));
        $banner.parent().show();
        setTimeout(function() {
          $banner.removeClass('slide-away');
        }, 0);
      } else {
        $banner.addClass('slide-away');
        setTimeout(function() {
          if(model.get(self.unreadPropertyName) === 0) {
            $banner.parent().hide();
          }
        }, 500);
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
