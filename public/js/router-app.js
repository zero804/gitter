/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'backbone',
  'utils/context',
  'utils/appevents',
  'views/app/appIntegratedView',
  'views/toolbar/troupeMenu',
  // 'views/chat/chatInputView',
  // 'views/chat/chatCollectionView',
  // 'collections/instances/integrated-items',
  'collections/instances/troupes',
  // 'views/righttoolbar/rightToolbarView',
  // 'views/people/personDetailView',
  // 'views/shareSearch/inviteView',
  // 'views/app/troupeSettingsView',
  // 'views/app/integrationSettingsModal',
  // 'views/toolbar/troupeMenu',
  // 'utils/router',
  // 'components/unread-items-client',
  'views/widgets/preload', // No ref
  'components/webNotifications', // No ref
  'components/desktopNotifications', // No ref
  'components/errorReporter',  // No ref
  'template/helpers/all', // No ref
], function($, Backbone, context, appEvents, AppIntegratedView, TroupeMenuView, troupeCollections) {
  "use strict";

  var troupeCollection = troupeCollections.troupes;

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
