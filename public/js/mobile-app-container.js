/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'backbone',
  'retina',
  'utils/mobile-resizer',
  'utils/is-android',
  'views/toolbar/troupeMenu',
  'marionette',
  'views/app/mobileAppView',
  'routers/mobile/web/mobile-app-router'
  ], function($, Backbone, retina, mobileResizer, isAndroid, TroupeMenu, Marionette, MobileAppView, AppRouter) {
  "use strict";

  new MobileAppView({
    el: $('#mainPage')
  });

  var app = new Marionette.Application();

  app.addRegions({
    content: '#frame-chat'
  });

  app.addInitializer(function() {
      new TroupeMenu({
        el: $('#troupeList')
      }).render();

      if(!isAndroid()) {
        mobileResizer.hideAddressBar();
        window.addEventListener("orientationchange", function() {
          mobileResizer.hideAddressBar();
        });
      }

      var fakeWindow = {};
      retina.init(fakeWindow);
      fakeWindow.onload();
  });

  app.on('start', function(){
    Backbone.history.start();
  });

  return app;

});
