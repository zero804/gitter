/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'routers/userhome-router',
  'views/userhome/userHomeView',
  'components/modal-region',
  'jquery',
  'backbone',
  'views/toolbar/troupeMenu',
  'marionette',
  'views/app/mobileAppView'
  ], function(UserhomeRouter, UserHomeView, modalRegion, $, Backbone, TroupeMenu, Marionette, MobileAppView) {
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
  });

  app.on('start', function(){
    Backbone.history.start();
  });

  app.addInitializer(function() {
    document.getElementById('chat-amuse').style.display = 'none';

    new UserhomeRouter({
      regions: [null, modalRegion]
    });

  });
  app.content.show(new UserHomeView());
  app.start();
});
