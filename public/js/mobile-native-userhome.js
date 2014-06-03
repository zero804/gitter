/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'utils/context',
  'views/userhome/userHomeView',
  'jquery',
  'utils/appevents',
  'components/cordova-navigate',
  'components/csrf'             // No ref
  ], function(context, UserHomeView, $, appEvents, cordovaNavigate) {
  "use strict";

  function onContextLoad() {
    new UserHomeView({
      el: $('#frame-chat')
    }).render();

    appEvents.on('navigation', cordovaNavigate);

    $('html').removeClass('loading');
  }

  var user = context.user();

  // because appcache would make the user context permanent, we have to
  // use the realtime connection and wait for the context to update.
  if(user.get('username')) {
    onContextLoad();
  } else {
    user.once('change', onContextLoad);
  }

});
