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
  'dropdown',
  'jqueryui',
  'template/helpers/all'
], function($, _, Backbone, TroupeViews, AppRouter, Bootstrap, Dropdown, jqUI) {
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
      //$(".label-displayName").text(window.troupeContext.user.displayName);
      //$(".label-troupeName").text(window.troupeContext.troupe.name);
      //$(".menu-security").show();
    },

    profileMenuClicked: function() {
      require(['views/profile/profileModalView'], function(ProfileModalView) {
        view = new ProfileModalView({ existingUser: true });
        modal = new TroupeViews.Modal({ view: view  });

        view.on('profile.complete', function(data) {
          modal.off('profile.complete');
          modal.hide();
        });
        modal.show();
      });
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

  window.troupeApp = new AppRouter();
  troupeApp = window.troupeApp;

  Backbone.history.start();
});
