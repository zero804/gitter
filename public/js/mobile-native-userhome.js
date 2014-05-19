/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'views/userhome/userHomeView',
  'jquery',
  'utils/appevents',
  'components/cordova-navigate',
  'components/csrf'             // No ref
  ], function(UserHomeView, $, appEvents, cordovaNavigate) {
  "use strict";

  new UserHomeView({
    el: $('#frame-chat')
  }).render();

  appEvents.on('navigation', cordovaNavigate);

  $('html').removeClass('loading');

});
