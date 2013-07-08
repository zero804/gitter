/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'backbone',
  'views/shareSearch/shareSearchView',
  'views/app/appIntegratedView',
  'views/userHome/userHomeView',
  'collections/instances/troupes',
  'views/profile/profileView',
  'views/signup/createTroupeView',
  'views/app/userHeaderView',
  'views/toolbar/troupeMenu',
  'utils/router',
  'components/errorReporter',
  'components/dozy',
  'components/webNotifications',
  'template/helpers/all',
  'backbone.keys' // no ref
], function(Backbone, shareSearchView, AppIntegratedView, UserHomeView, troupeCollections,
  profileView, createTroupeView, UserHeaderView, TroupeMenuView, Router /*, errorReporter , dozy, webNotifications,_Helpers,  _backboneKeys*/) {

  "use strict";

  var appView = new AppIntegratedView();
  appView.leftMenuRegion.show(new TroupeMenuView());
  appView.headerRegion.show( new UserHeaderView());

  new UserHomeView({ el: '#chat-frame' }).render();

  // Asynchronously load tracker
  require(['utils/tracking'], function() { });

  if(window.troupeContext.profileNotCompleted) {
   var view = new profileView.Modal({ disableClose: true  });

   view.once('close', function() {
     window.location.reload(true);
   });
   view.show();

   return;
  }

  new Router({
      routes: [
        { name: "profile",        re: /^profile$/,                viewType: profileView.Modal },
        { name: "create",         re: /^create$/,                 viewType: createTroupeView.Modal, collection: troupeCollections.troupes,   skipModelLoad: true },
        { name: "share",          re: /^share$/,                  viewType: shareSearchView.Modal },
        { name: "connect",          re: /^connect$/,              viewType: shareSearchView.Modal, viewOptions: { overrideContext: true, inviteToConnect: true } }
      ],
      appView: appView
    });

  Backbone.history.start();

});
