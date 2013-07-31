/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'retina',
  'utils/mobile-resizer',
  'routers/mobile/mobile-router',
  'views/toolbar/troupeMenu',
  'views/app/mobileAppView'
  ], function($, retina, mobileResizer, MobileRouter, TroupeMenu, MobileAppView) {
  "use strict";

  var MobileAppRouter = MobileRouter.extend({
    initialize: function() {
      this.constructor.__super__.initialize.apply(this);

      new TroupeMenu({
        el: $('#troupeList')
      }).render();

      new MobileAppView({
        el: $('#pageContainer')
      });

      var fakeWindow = {};
      retina.init(fakeWindow);
      fakeWindow.onload();

      window.addEventListener("orientationchange", function() {
        mobileResizer.reset();
      });
    }
  });

  new MobileAppRouter();

});
