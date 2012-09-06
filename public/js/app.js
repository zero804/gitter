/*
 * Beware of using CDN libraries if you're using compiling r.js modules
 * http://requirejs.org/docs/api.html#config-shim
 */
require.config(window.require_config);

require([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'router',
  'bootstrap',
  'template/helpers/all'
], function($, _, Backbone, TroupeViews, appRouter) {
  var troupeApp;

  // THESE TWO LINES WILL NOT REMAIN HERE FOREVER
  $('.dp-tooltip').tooltip();
  $('.chat-bubble').tooltip();

  window.troupeApp = appRouter;
  troupeApp = window.troupeApp;
  Backbone.history.start();

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function(tracking) {
    // No need to do anything here
  });

});
