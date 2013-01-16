/*jshint unused:true browser:true*/
require([
  'jquery',
  'underscore',
  'backbone',
  './base-router',
  'views/base',
  'routes/mail-routes'
], function($, _, Backbone, BaseRouter, TroupeViews, mailRoutes) {
  /*jslint browser: true */
  /*global console:false, require: true */
  "use strict";

  var AppRouter = BaseRouter.extend({
    initialize: function() {
      this.createRouteMixins(mailRoutes);
    },

    defaultAction: function(actions){
      this.showAsync('views/conversation/conversationView');
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
