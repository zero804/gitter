/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'views/base',
  'hbs!./tmpl/userHomeTemplate'
], function(TroupeViews, userHomeTemplate) {
  "use strict";

  return TroupeViews.Base.extend({
    template: userHomeTemplate,
    getRenderData: function() {
      var c = window.troupeContext;
      return {
        username: c.user.username,
        basePath: c.basePath,
        baseServer: c.baseServer
      };
    }
  });

});
