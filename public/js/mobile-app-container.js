/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'backbone',
  'marionette',
  'views/app/mobileAppView',
  'routers/mobile/web/mobile-app-router'
  ], function($, Backbone, Marionette, MobileAppView, AppRouter) {
  "use strict";

  new MobileAppView({
    el: $('#pageContainer')
  });

  var app = new Marionette.Application();

  app.addRegions({
    content: '#frame-chat'
  });

  app.on('start', function(){
    new AppRouter();
    Backbone.history.start();
  });

  return app;

});
