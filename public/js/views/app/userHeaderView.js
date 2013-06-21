/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'backbone',
  "views/base",
  "hbs!./tmpl/appHeader",
  "views/signup/usernameView",
  'log!user-header-view'
  ], function($, _, Backbone, TroupeViews, appHeaderTemplate, UsernameView, log) {
  "use strict";

  return TroupeViews.Base.extend({
    template: appHeaderTemplate,

    getRenderData: function() {
      var user = window.troupeContext.user;
      return {
        headerTitle: user.displayName,
        isTroupe: false,
        troupeContext: window.troupeContext,
        user: user
      };
    },

    onMouseEnterHeader: function() {
      this.showProfileMenu();
    },

    onMouseLeaveHeader: function() {
      this.hideProfileMenu();
    },

    showProfileMenu: function() {
      if (!this.profilemenu) {

        // $(".trpProfileMenu").animate({
        //     width: '132px'
        // }, 250, function () {

        // });

        $(".trpProfileMenu").fadeIn('fast');
        this.profilemenu = true;
      }
    },

    hideProfileMenu: function() {
      if (this.profilemenu) {
        $(".trpProfileMenu").fadeOut('fast');
        // $(".trpProfileMenu").animate({
        //     width: '0px'
        // }, 250);
        this.profilemenu = false;
      }
    }

  });

});