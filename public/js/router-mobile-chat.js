/*jshint unused:true browser:true*/
require([
  'jquery',
  'underscore',
  'backbone',
  './base-router',
  'views/base',
  'components/chat/chat-component',
  'components/unread-items-client'
], function($, _, Backbone, BaseRouter, TroupeViews, chat, unreadItemsClient) {
  "use strict";

  var AppRouter = BaseRouter.extend({
    initialize: function() {
      chat.connect();
    },

    defaultAction: function(actions){
      this.showChatView();
    },

    showChatView: function() {
      this.navIcon('#chat-icon');
      this.showAsync('views/chat/chatView');
    }

  });

  var troupeApp = new AppRouter();

  // THESE TWO LINES WILL NOT REMAIN HERE FOREVER
  //$('.dp-tooltip').tooltip();
  //$('.chat-bubble').tooltip();

  window.troupeApp = troupeApp;
  Backbone.history.start();

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function(tracking) {
    // No need to do anything here
  });

  return troupeApp;
});
