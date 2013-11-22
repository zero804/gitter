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
      var displayName;
      if (context.getUser().displayName === '' || !context.getUser().displayName) {
        displayName = context.getUser().username;
      }
      else {
        displayName = context.getUser().displayName;
      }
      return {
        displayName: displayName,
        user: context.user()
      };
    }
  });
});
