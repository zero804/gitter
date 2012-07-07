/*
 * Beware of using CDN libraries if you're using compiling r.js modules
 * http://requirejs.org/docs/api.html#config-shim
 */
require.config(window.require_config);

require([
  'jquery',
  'underscore',
  'backbone',
  'router',
  'router-login',
  'bootstrap',
  'dropdown',
  'jqueryui',
  'template/helpers/all'
], function($, _, Backbone, AppRouter, AppRouterLogin, Bootstrap, Dropdown, jqUI) {
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

  $('.dp-tooltip').tooltip();
  $('.chat-bubble').tooltip();

  var AppView = Backbone.View.extend({
    el: 'body',

    initialize: function() {
      this.buildToolbar();
    },

    events: {
      "click .menu-profile": "profileMenuClicked",
      "click .menu-settings": "settingsMenuClicked",
      "click .menu-signout": "signoutMenuClicked"

    },

    buildToolbar: function() {
      if(window.troupeContext.user) {
        $(".label-displayName").text(window.troupeContext.user.displayName);
        $(".label-troupeName").text(window.troupeContext.troupe.name);
        $(".menu-security").show();
      }

    },

    profileMenuClicked: function() {
      troupeApp.navigate("profile", {trigger: true});
      return false;
    },

    settingsMenuClicked: function() {
      troupeApp.navigate("settings", {trigger: true});
      return false;
    },

    signoutMenuClicked: function() {
      troupeApp.navigate("signout", {trigger: true});
      return false;
    }


  });
  var app = new AppView();


  if(!window.troupeContext.user) {
    window.troupeApp = new AppRouterLogin();
    troupeApp = window.troupeApp;
    Backbone.history.start();

    return;
  }

  window.troupeApp = new AppRouter();
  troupeApp = window.troupeApp;

  Backbone.history.start();
});
