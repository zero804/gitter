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

  cordovaNavigate.setNativeToUserhome();

  function onContextLoad() {
    new UserHomeView({
      el: $('#frame-chat')
    }).render();

    appEvents.on('navigation', cordovaNavigate.navigate);

    $('html').removeClass('loading');
  }

  var user = context.user();

  /*
   * A user's "scopes" property is required by the UserHomeView's render function.
   * User properties are not on the context for native mobile as they would be cached
   * until a new release.
   * Because of this, we have to wait until the realtime connection updates the user
   * model before we can create the view.
   */
  if(user.get('scopes')) {
    onContextLoad();
  } else {
    user.once('change', onContextLoad);
  }

});
