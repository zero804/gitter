/*
 * Beware of using CDN libraries if you're using compiling r.js modules
 * http://requirejs.org/docs/api.html#config-shim
 */
require.config(window.require_config);

require([
  'jquery',
  'underscore',
  'backbone',
  'router-login',
  'bootstrap',
  'template/helpers/all'
], function($, _, Backbone, AppRouterLogin, Bootstrap) {
  /*jshint trailing:false */
  /*global console:false, require: true */
  "use strict";

  var troupeApp;
  window.troupeApp = new AppRouterLogin();
  troupeApp = window.troupeApp;
  Backbone.history.start();

  return;
});
