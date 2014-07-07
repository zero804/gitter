require([
  'views/app/appIntegratedView',
  'views/userhome/userHomeView',
  'utils/appevents',
  'components/csrf'                             // No ref
], function(AppIntegratedView, UserHomeView, appEvents) {

  "use strict";

  new AppIntegratedView();

  new UserHomeView({ el: '#content-wrapper' }).render();

  appEvents.on('navigation', function(url) {
    var rootWindow = window.parent || window;
    rootWindow.location.href = url;
  });

  // Asynchronously load tracker
  require(['utils/tracking'], function() { });
});
