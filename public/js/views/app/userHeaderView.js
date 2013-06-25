/*jshint unused:strict, browser:true */
define([
  'jquery',
  'underscore',
  'utils/context',
  'backbone',
  "views/base",
  "hbs!./tmpl/appHeader",
  "views/signup/usernameView"
  ], function($, _, context, Backbone, TroupeViews, appHeaderTemplate, UsernameView) {
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