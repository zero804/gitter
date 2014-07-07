require([
  'views/userhome/userHomeView',
  'jquery',
  'utils/appevents',
  'views/toolbar/troupeMenu',
  'views/app/mobileAppView',
  'components/csrf'             // No ref
  ], function(UserHomeView, $, appEvents, TroupeMenu, MobileAppView) {
  "use strict";

  appEvents.on('navigation', function(url) {
    window.location.href = url;
  });

  new MobileAppView({
    el: $('#mainPage')
  });

  new TroupeMenu({
    el: $('#troupeList')
  }).render();

  new UserHomeView({
    el: $('#frame-chat')
  }).render();

  $('html').removeClass('loading');

});
