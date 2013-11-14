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
      return {
        displayName: context.getUser().displayName,
        user: context.user()
      };
    }
  });
});
