/*jshint unused:strict, browser:true */
require([
  'jquery',
  'underscore',
  'backbone',
  './base-router',
  'views/base',
  'views/conversation/conversationView',
  'views/conversation/conversationDetailView',
  'collections/conversations',
  'components/eyeballs',
  'components/unread-items-client'
], function($, _, Backbone, BaseRouter, TroupeViews, ConversationView, conversationDetailView, conversationModels/*, unreadItemsClient*/) {
  /*jslint browser: true, unused: true */
  "use strict";

  var AppRouter = BaseRouter.extend({
    routes: {
      'mail/:id':     'showConversation',
      '*actions':     'defaultAction'
    },

    initialize: function() {
      var self = this;
      this.collection = new conversationModels.ConversationCollection();
      this.collection.listen();
      self.collection.fetch();
    },

    defaultAction: function(){
      var view = new ConversationView({ collection: this.collection });
      this.showView("#primary-view", view);
    },

    showConversation: function(id) {
      // why is this not showing anything?
      var view = new conversationDetailView.View({ id: id });
      this.showView("#primary-view", view);
    }

  });

  $('.trpMobileAmuseIcon').click(function() {
    document.location.reload(true);
  });

  var troupeApp = new AppRouter();

  window.troupeApp = troupeApp;
  Backbone.history.start();

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function() {
    // No need to do anything here
  });

  return troupeApp;
});
