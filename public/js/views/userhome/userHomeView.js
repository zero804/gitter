/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'views/base',
  'utils/context',
  'hbs!./tmpl/userHomeTemplate'
], function(TroupeViews, context, userHomeTemplate) {
  "use strict";

  return TroupeViews.Base.extend({
    template: userHomeTemplate,
    getRenderData: function() {
      return {
        username: context.getUser().username,
        basePath: context.env('basePath'),
        baseServer: context.env('baseServer')
      };
    }
  });

});
