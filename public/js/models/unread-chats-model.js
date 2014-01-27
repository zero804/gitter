/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'backbone',
  'utils/appevents'
  ], function(Backbone, appEvents)  {
  "use strict";

  function getNewUnreadMessageCount(chatCollection) {
    var messages = chatCollection.models;
    var count = 0;
    while(count < messages.length && messages[messages.length - (1+count)].get('unread')) {
      count++;
    }
    return count;
  }

  return Backbone.Model.extend({
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

});
