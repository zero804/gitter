/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
require([
  'jquery',
  'underscore',
  'utils/context',
  'backbone',
  'backbone.keys', // no ref
  'marionette',
  'template/helpers/all',
  'views/base',
  'views/shareSearch/shareSearchView',
  'components/dozy',
  'views/app/appIntegratedView',
  'views/userHome/userHomeView',
  'collections/instances/troupes',
  'views/profile/profileView',
  'views/signup/createTroupeView',
  'views/app/userHeaderView',
  'components/webNotifications',
  'views/toolbar/troupeMenu',
  'utils/router',
  'components/errorReporter'
], function($, _, context, Backbone, _backboneKeys, Marionette, _Helpers, TroupeViews, shareSearchView, dozy, AppIntegratedView, UserHomeView, troupeCollections,
  profileView, createTroupeView, UserHeaderView, webNotifications, TroupeMenuView, Router /*, errorReporter , FilteredCollection */) {

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
