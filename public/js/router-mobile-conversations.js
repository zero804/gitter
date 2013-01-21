/*jshint unused:true browser:true*/
require([
  'jquery',
  'underscore',
  'backbone',
  './base-router',
  'views/base',
  'views/conversation/conversationView',
  'views/conversation/conversationDetailView',
  'collections/conversations'
], function($, _, Backbone, BaseRouter, TroupeViews, ConversationView, conversationDetailView, conversationModels) {
  /*jslint browser: true, unused: true */
  /*global console:false, require: true */
  "use strict";

  var AppRouter = BaseRouter.extend({
    routes: {
      'mail/:id':     'showConversation',
      '*actions':     'defaultAction'
    },

    initialize: function() {
      this.collection = new conversationModels.ConversationCollection();
      this.collection.fetch();
      this.collection.listen();
    },

    defaultAction: function(actions){
      var view = new ConversationView({ collection: this.collection });
      this.showView("#primary-view", view);
    },

    showConversation: function(id) {
      // why is this not showing anything?
      var view = new conversationDetailView.View({ id: id });
      this.showView("#primary-view", view);
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
