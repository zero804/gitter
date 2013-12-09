/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'routers/userhome-router',
  'views/userhome/userHomeView',
  'components/modal-region',
  'jquery',
  'backbone',
  'views/toolbar/troupeMenu',
  'views/app/mobileAppView'
  ], function(UserhomeRouter, UserHomeView, modalRegion, $, Backbone, TroupeMenu, MobileAppView) {
  "use strict";

  new MobileAppView({
    el: $('#mainPage')
  });

  new TroupeMenu({
    el: $('#troupeList')
  }).render();

  document.getElementById('chat-amuse').style.display = 'none';

  new UserhomeRouter({
    regions: [null, modalRegion]
  });

  new UserHomeView({
    el: $('#frame-chat')
  }).render();

  Backbone.history.start();

});
