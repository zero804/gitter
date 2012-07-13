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
  'dropdown',
  'template/helpers/all'
], function($, _, Backbone, AppRouterLogin, Bootstrap) {
  /*jshint trailing:false */
  /*global console:false, require: true */
  "use strict";

  /* From http://coenraets.org/blog/2012/01/backbone-js-lessons-learned-and-improved-sample-app/ */
  Backbone.View.prototype.close = function () {
    console.log('Closing view ' + this);
    if (this.beforeClose) {
      this.beforeClose();
    }
    this.remove();
    this.unbind();
  };

  var troupeApp;
  window.troupeApp = new AppRouterLogin();
  troupeApp = window.troupeApp;
  Backbone.history.start();

  return;
});
