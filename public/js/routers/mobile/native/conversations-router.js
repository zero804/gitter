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
  'components/native-troupe-context', // No ref
  'components/oauth',                 // No Ref
  'components/eyeballs',              // No ref
  'template/helpers/all',             // No ref
  'components/native-context'         // No ref
], function($, _, Backbone, context, MobileRouter, TroupeViews, ConversationView, conversationDetailView, conversationModels) {
  /*jslint browser: true, unused: true */
  "use strict";

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
      this.show('primary', view);
    },

    showConversation: function(id) {
      // why is this not showing anything?
      var view = new conversationDetailView.View({ id: id });
      this.show('primary', view);
    }

  });

  var troupeApp = new AppRouter();

  window.troupeApp = troupeApp;
  Backbone.history.start();

  return troupeApp;
});
