/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'underscore',
  'backbone',
  'utils/context',
  'routers/mobile/mobile-router',
  'views/base',
  'views/conversation/conversationView',
  'views/conversation/conversationDetailView',
  'collections/conversations',
  'components/mobile-context',        // No ref
  'components/eyeballs',              // No ref
  'components/unread-items-client',   // No ref
  'template/helpers/all',             // No ref
  'components/native-context'         // No ref
], function($, _, Backbone, context, MobileRouter, TroupeViews, ConversationView, conversationDetailView, conversationModels/*, unreadItemsClient*/) {
  /*jslint browser: true, unused: true */
  "use strict";

  // TODO: normalise this
  var troupeId = window.location.hash.substring(1);
  context.setTroupeId(troupeId);
  window.location.hash = '';

  var AppRouter = MobileRouter.extend({
    routes: {
      'mail/:id':     'showConversation',
      '*actions':     'defaultAction'
    },

    initialize: function() {
      this.constructor.__super__.initialize.apply(this);

      this.collection = new conversationModels.ConversationCollection();
      this.collection.listen();
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

  var troupeApp = new AppRouter();

  window.troupeApp = troupeApp;
  Backbone.history.start();

  return troupeApp;
});
