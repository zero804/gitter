require([
  'views/userhome/userHomeView',
  'utils/appevents',
  'components/csrf'                             // No ref
], function(UserHomeView, appEvents) {

  "use strict";

  new UserHomeView({ el: '#content-wrapper' }).render();

  appEvents.on('navigation', function(url) {
    var rootWindow = window.parent || window;
    if(url.indexOf('#') === 0) {
      rootWindow.location.hash = url;
    } else {
      rootWindow.location.href = url;
    }
  });

  // Asynchronously load tracker
  require(['utils/tracking'], function() { });
});
