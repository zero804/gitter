/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'backbone',
  'utils/appevents'
  ], function(backbone, appEvents)  {
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
      'click': 'scrollToFirstUnread'
    },
    initialize: function(options) {
      this.chatCollectionView = options.chatCollectionView;
      this.model = new UnreadModel();
      this.listenTo(this.model, 'change', this.render);
    },
    render: function() {
      var unreadCount = this.model.get('unreadCount');

      if(unreadCount === 1) {
        this.$el.text('1 unread message');
        this.$el.removeClass('hide');
      } else if(unreadCount > 1) {
        this.$el.text(unreadCount+' unread messages');
        this.$el.removeClass('hide');
      } else {
        this.$el.addClass('hide');
      }
    },
    scrollToFirstUnread: function() {
      this.chatCollectionView.scrollToFirstUnread();
    }
  });

});
