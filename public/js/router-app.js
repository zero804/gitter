/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'utils/appevents',
  'views/app/appIntegratedView',
  'views/toolbar/troupeMenu',
  'views/widgets/preload', // No ref
  'components/webNotifications', // No ref
  'components/desktopNotifications', // No ref
  'components/errorReporter',  // No ref
  'template/helpers/all', // No ref
], function(appEvents, AppIntegratedView, TroupeMenuView) {
  "use strict";

  var appView = new AppIntegratedView({ });

  appView.leftMenuRegion.show(new TroupeMenuView({ }));

  function updateContent(url) {
    document.getElementById('content-frame').src = url;
  }

  appEvents.on('navigation', function(url, model) {
    window.history.pushState(url, model.get('name'), url);
    updateContent(url);
  });

  // Revert to a previously saved state
  window.addEventListener('popstate', function(event) {
    updateContent(event.state);
  });

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function(/*tracking*/) {
    // No need to do anything here
  });
});
