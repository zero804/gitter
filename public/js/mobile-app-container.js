/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'backbone',
  'retina',
  'utils/mobile-resizer',
  'views/toolbar/troupeMenu',
  'marionette',
  'views/app/mobileAppView',
  'routers/mobile/web/mobile-app-router'
  ], function($, Backbone, retina, mobileResizer, TroupeMenu, Marionette, MobileAppView, AppRouter) {
  "use strict";

  new MobileAppView({
    el: $('#pageContainer')
  });

  var app = new Marionette.Application();

  app.addRegions({
    content: '#frame-chat'
  });

  app.addInitializer(function() {
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
  });

  app.on('start', function(){
    Backbone.history.start();
  });

  return app;

});
