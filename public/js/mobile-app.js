"use strict";

var context = require('utils/context');
var $ = require('jquery');
var appEvents = require('utils/appevents');
var chatModels = require('collections/chat');
var Backbone = require('backbone');
var onready = require('./utils/onready');
var MobileLayout = require('views/layouts/mobile');
var RoomCollectionTracker = require('components/room-collection-tracker');
var troupeCollections = require('collections/instances/troupes');
var repoModels = require('collections/repos');
var ReposCollection = repoModels.ReposCollection;
var unreadItemsClient = require('components/unread-items-client');

//Remove when left menu is in place
var FastClick = require('fastclick');

//Left Menu Additions
//var gestures              = require('utils/gesture-controller');

require('utils/tracking');

/* Set the timezone cookie */
require('components/timezone-cookie');

// Preload widgets
require('views/widgets/avatar');
require('components/ping');
require('components/eyeballs');
require('template/helpers/all');
require('utils/gesture-controller');

onready(function() {
  //Ledt Menu Additions
  //gestures.init();


  //Remove when left menu is in place
  FastClick.attach(document.body);

  require('components/link-handler').installLinkHandler();
  appEvents.on('navigation', function(url) {
    window.location.href = url;
  });

  new RoomCollectionTracker(troupeCollections.troupes);

  var chatCollection = new chatModels.ChatCollection(null, { listen: true });

  unreadItemsClient.syncCollections({
    'chat': chatCollection
  });

  var repoCollection = new ReposCollection();

  var appView = new MobileLayout({
    model: context.troupe(),
    template: false,
    el: 'body',
    chatCollection: chatCollection,
    //Left Menu Additions
    //roomCollection: troupeCollections.troupes
    orgCollection: troupeCollections.orgs,
    repoCollection: repoCollection
  });
  appView.render();

  var Router = Backbone.Router.extend({
    routes: {
      "": "hideModal",
      "notifications": "notifications",
      'notification-defaults': 'notificationDefaults',
      'createcommunity': 'createCommunity'
    },

    hideModal: function() {
      appView.dialogRegion.destroy();
    },

    notifications: function() {
      require.ensure(['views/modals/notification-settings-view'], function(require) {
        var NotificationSettingsView = require('views/modals/notification-settings-view');
        appView.dialogRegion.show(new NotificationSettingsView({ model: new Backbone.Model() }));
      });
    },

    notificationDefaults: function() {
      require.ensure(['./views/modals/notification-defaults-view'], function(require) {
        var NotificationDefaultsView = require('./views/modals/notification-defaults-view');

        appView.dialogRegion.show(new NotificationDefaultsView({
          model: new Backbone.Model()
        }));

      });
    },

    createCommunity: function(/* uri */) {
      appEvents.trigger('community-create-view:toggle', true);
    }
  });

  new Router();

  $('html').removeClass('loading');

  Backbone.history.start();
});
