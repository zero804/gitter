/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define(['backbone'], function(backbone)  {
  "use strict";

  return backbone.View.extend({
    events: {
      'click': 'scrollToFirstUnread'
    },
    initialize: function(options) {
      this.chatCollectionView = options.chatCollectionView;
      this.listenTo(this.collection, 'add reset change', this.render, this);
    },
    render: function() {
      var unreadCount = this.collection.where({unread: true}).length;
      var message = unreadCount+' unread message';
      if(unreadCount > 1) {
        message = message+'s';
      }
      this.$el.toggleClass('hide', unreadCount === 0);
      this.$el.text(message);
    },
    scrollToFirstUnread: function() {
      this.chatCollectionView.scrollToFirstUnread();
    }
  });

});
