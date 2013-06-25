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
    }

  });

});