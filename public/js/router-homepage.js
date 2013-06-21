/*jshint unused:true, browser:true*/
require([
  'jquery',
  'underscore',
  'backbone',
  'backbone.keys', // no ref
  'marionette',
  'template/helpers/all',
  'views/base',
  'components/dozy',
  'views/app/appIntegratedView',
  'views/userHome/userHomeView',
  'collections/instances/troupes',
  'views/profile/profileView',
  'views/signup/createTroupeView',
  'views/app/userHeaderView',
  'hbs!./views/app/tmpl/appHeader',
  'components/webNotifications',
  'views/toolbar/troupeMenu',
  'utils/router',
  'components/errorReporter'
], function($, _, Backbone, _backboneKeys, Marionette, _Helpers, TroupeViews, dozy, AppIntegratedView, UserHomeView, troupeCollections,
  profileView, createTroupeView, UserHeaderView, headerViewTemplate, webNotifications, TroupeMenuView, Router /*, errorReporter , FilteredCollection */) {

  "use strict";

  var appView = new AppIntegratedView();
  appView.leftMenuRegion.show(new TroupeMenuView());


  troupeCollections.recentTroupes.on('sync', function() {
    console.log('RESET HERE!!!!', troupeCollections.recentTroupes.length);
  });

  troupeCollections.troupes.on('sync', function() {
    console.log('RESET HERE!!!!', troupeCollections.troupes.length);
  });

  var headerView = new (TroupeViews.Base.extend({
    template: headerViewTemplate,
    getRenderData: function() {
      return { user: window.troupeContext.user, troupeContext: troupeContext };
    }
  }))();

  appView.headerRegion.show(headerView);
  new UserHomeView({ el: '#chat-frame' }).render();

  $('#mail-list').hide();

  new Router({
      routes: [
        { name: "profile",        re: /^profile$/,                viewType: profileView.Modal },
        { name: "create",         re: /^create$/,                 viewType: createTroupeView.Modal, collection: troupeCollections.troupes,   skipModelLoad: true }
      ],
      appView: appView
    });

  Backbone.history.start();


  // Asynchronously load tracker
  require(['utils/tracking'], function() { });

});
