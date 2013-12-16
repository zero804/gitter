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

  function updateContent(state) {
    // TODO: update the title....
    document.getElementById('content-frame').src = state;
  }

  appEvents.on('navigation', function(url, type, title) {
    var frameUrl = url + '/';
    if(url.substring(1).indexOf('/') < 0) {
      frameUrl += '-/';
    }
    frameUrl += type;

    window.history.pushState(frameUrl, title, url);
    updateContent(frameUrl);
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
