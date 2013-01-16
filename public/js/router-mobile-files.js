/*jshint unused:true browser:true*/
require([
  'jquery',
  'underscore',
  'backbone',
  './base-router',
  'views/base'
], function($, _, Backbone, BaseRouter, TroupeViews ) {
  "use strict";

  var AppRouter = BaseRouter.extend({
    defaultAction: function(actions){
      this.showFileView();
    },

    showFileView: function() {
      this.showAsync('views/file/fileView');
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
