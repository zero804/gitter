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
      'click .banner-button': 'scrollToFirstUnread',
      'click .banner-side-button': 'dismissAll'
    },
    initialize: function(options) {
      this.chatCollectionView = options.chatCollectionView;
      this.model = new UnreadModel();
      this.listenTo(this.model, 'change', this.render);
    },
    render: function() {
      var unreadCount = this.model.get('unreadCount');

      this.$el.html(template({
        unreadCount: unreadCount,
        isPlural: unreadCount > 1
      }));
      this.$el.toggleClass('hide', !unreadCount);
    },
    scrollToFirstUnread: function() {
      this.chatCollectionView.scrollToFirstUnread();
    },
    dismissAll: function() {
      $.ajax({
        url: "/api/v1/troupes/" + context.getTroupeId() + "/unreadItems/all",
        contentType: "application/json",
        type: "DELETE",
      });
    }
  });

});
