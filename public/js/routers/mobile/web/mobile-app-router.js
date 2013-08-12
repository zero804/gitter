/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'retina',
  'utils/mobile-resizer',
  'routers/mobile/mobile-router',
  'views/toolbar/troupeMenu'
  ], function($, retina, mobileResizer, MobileRouter, TroupeMenu) {
  "use strict";

  var MobileAppRouter = MobileRouter.extend({
    initialize: function() {

      this.constructor.__super__.initialize.apply(this);

      new TroupeMenu({
        el: $('#troupeList')
      }).render();

      mobileResizer.reset();

      var fakeWindow = {};
      retina.init(fakeWindow);
      fakeWindow.onload();

      window.addEventListener("orientationchange", function() {
        mobileResizer.reset();
      });

    }
  });

  return MobileAppRouter;

});
