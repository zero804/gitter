/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/context',
  'views/base',
  'hbs!./tmpl/profile',
], function(context, TroupeViews, template) {
  "use strict";

  return TroupeViews.Base.extend({
    template: template,
    getRenderData: function() {
      var user = context.getUser();
      var userModel = context.user();
      return {
        displayName: user.displayName || user.username,
        user: userModel,
        username: user.username
      };
    }
  });
});
