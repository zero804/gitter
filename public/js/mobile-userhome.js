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

  new UserHomeView({
    el: $('#frame-chat')
  }).render();

});
