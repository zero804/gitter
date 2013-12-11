/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'backbone',
  'views/base',
  'utils/context',
  'utils/router',
  'hbs!views/login/tmpl/loginRequestModalView',
  'views/app/appIntegratedView',
  'views/userhome/userHomeView',
  'views/toolbar/troupeMenu',
  'hbs!views/connect/tmpl/connectUserTemplate',
  'collections/instances/troupes',
  // 'views/app/smartCollectionView',
  'components/errorReporter',
  'components/dozy',
  'components/webNotifications',
  'components/desktopNotifications',
  'template/helpers/all'
], function(Backbone, TroupeViews, context, Router, loginRequestTemplate,  AppIntegratedView, UserHomeView, TroupeMenuView, connectUserTemplate, troupeCollections /*SmartCollectionView*/, errorReporter , dozy, webNotifications,_Helpers) {

  "use strict";

  var troupeCollection = troupeCollections.troupes;
  var appView = new AppIntegratedView();
  appView.leftMenuRegion.show(new TroupeMenuView());

  new UserHomeView({ el: '#content-wrapper' }).render();

  // Asynchronously load tracker
  require(['utils/tracking'], function() { });

  // TODO: stop using localstorage for this, move to context events
  try {
    var ls = window.localStorage;
    if (ls) {
      // Show a popup to confirm access requests through signup.
      if(ls.pendingRequestConfirmation) {
        window.location.hash = '#|joinrequestsent';
      }

      // Show a popup to confirm connection invite through signup.
      if (ls.pendingConnectConfirmation) {
        window.location.hash = '#|invitesent';
      }
    }
  }
  catch (e) {}

  new Router({
    routes: [],
    regions: [appView.rightPanelRegion, appView.dialogRegion],
    rootHandler: function() {}
  });

  Backbone.history.start();

});
