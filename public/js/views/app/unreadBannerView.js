/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'backbone',
  'utils/context',
  'utils/appevents',
  'hbs!./tmpl/unreadBannerTemplate'
  ], function($, backbone, context, appEvents, template)  {
  "use strict";

  var UnreadModel = backbone.Model.extend({
    defaults: {
      unreadCount: 0
    },
    initialize: function() {
      this.listenTo(appEvents, 'unreadItemsCount', function(count) {
        this.set('unreadCount', count);
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
      this.model = new UnreadModel();
      this.listenTo(this.model, 'change', this.render);
    },
    render: function() {
      var model = this.model;
      var $banner = this.$el;
      var unreadCount = model.get('unreadCount');

      $banner.html(template({
        unreadCount: unreadCount,
        isPlural: unreadCount !== 1
      }));
      if(unreadCount > 0) {
        $banner.show();
        $banner.animate({height: 35, bottom: -35}, 500);
      } else {
        $banner.animate({height: 0, bottom: 0}, 500, function() {
          if(model.get('unreadCount') < 1) {
            $banner.hide();
          }
        });

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
