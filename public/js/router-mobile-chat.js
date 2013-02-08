/*jshint unused:true browser:true*/
require([
  'jquery',
  'underscore',
  'backbone',
  './base-router',
  'views/base',
  'views/chat/chatView'
], function($, _, Backbone, BaseRouter, TroupeViews, ChatView) {
  "use strict";

  var AppRouter = BaseRouter.extend({
    routes: {
      '*actions':     'defaultAction'
    },

    defaultAction: function(/*actions*/){
      var view = new ChatView();
      this.showView("#primary-view", view);
    }


  });

  var troupeApp = new AppRouter();

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
