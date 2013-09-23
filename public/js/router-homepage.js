/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'backbone',
  'views/base',
  'utils/context',
  'hbs!views/login/tmpl/loginRequestModalView',
  'views/app/appIntegratedView',
  'views/userhome/userHomeView',
  'views/app/headerView',
  'views/toolbar/troupeMenu',
  'routers/userhome-router',
  'hbs!views/connect/tmpl/connectUserTemplate',
  'components/errorReporter',
  'components/dozy',
  'components/webNotifications',
  'components/desktopNotifications',
  'template/helpers/all'
], function(Backbone, TroupeViews, context, loginRequestTemplate,  AppIntegratedView, UserHomeView, HeaderView, TroupeMenuView, UserhomeRouter, connectUserTemplate /*, errorReporter , dozy, webNotifications,_Helpers*/) {

  "use strict";

  var appView = new AppIntegratedView();
  appView.leftMenuRegion.show(new TroupeMenuView());
  appView.headerRegion.show( new HeaderView());

  new UserHomeView({ el: '#chat-frame' }).render();

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

  new UserhomeRouter({
    regions: [appView.rightPanelRegion, appView.dialogRegion],
    rootHandler: function() {
      if(window.localStorage.startTour) {
        delete window.localStorage.startTour;
        require([
          'tours/tour-controller'
        ], function(tourController) {
          tourController.init({ appIntegratedView: appView });
        });
      }
    }
  });

  Backbone.history.start();

});
