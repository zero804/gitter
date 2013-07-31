/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'retina',
  'utils/mobile-resizer',
  'routers/mobile/router-mobile-chat',
  'views/toolbar/troupeMenu',
  'views/app/mobileAppView'
  ], function($, retina, mobileResizer, router, TroupeMenu, MobileAppView) {
  "use strict";

  router.start();

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

});
