/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'views/userhome/userHomeView',
  'jquery',
  'views/toolbar/troupeMenu',
  'views/app/mobileAppView'
  ], function(UserHomeView, $, TroupeMenu, MobileAppView) {
  "use strict";

  new MobileAppView({
    el: $('#mainPage')
  });

  new TroupeMenu({
    el: $('#troupeList')
  }).render();

  document.getElementById('chat-amuse').style.display = 'none';

  new UserHomeView({
    el: $('#frame-chat')
  }).render();

});
