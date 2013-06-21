/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'views/app/userHeaderView',
  'log!troupe-header-view'
  ], function($, _, Backbone, TroupeViews, UserHeaderView, log) {
  "use strict";

  return UserHeaderView.extend({

    getRenderData: function() {
      var tx = window.troupeContext;
      var user = window.troupeContext.user;
      return {
        headerTitle: tx.troupe.name,
        isTroupe: true,
        troupeContext: tx,
        user: user
      };
    }
  });

});