/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'utils/context',
  'views/userhome/userHomeView',
  'jquery',
  'utils/appevents',
  'components/cordova-navigate',
  'log!mobile-native-userhome',
  'components/csrf'             // No ref
  ], function(context, UserHomeView, $, appEvents, cordovaNavigate, log) {
  "use strict";

  $(document).on('app.version.mismatch', function() {
    try {
      if(window.applicationCache.status == 1) {
        log('Attempting to update application cache');
        window.applicationCache.update();
      }
    } catch(e) {
      log('Unable to update application cache: ' + e, e);
    }
  });

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
