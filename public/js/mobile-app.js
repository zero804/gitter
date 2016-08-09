"use strict";

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var context = require('utils/context');
var appEvents = require('utils/appevents');
var onready = require('utils/onready');

var chatModels = require('collections/chat');
var troupeCollections = require('collections/instances/troupes');
var repoModels = require('collections/repos');
var RepoCollection = repoModels.ReposCollection;
var generateCreateGroupAndRoomRoutes = require('./generate-create-group-and-room-routes');

var unreadItemsClient = require('components/unread-items-client');
var RoomCollectionTracker = require('components/room-collection-tracker');
var MobileLayout = require('views/layouts/mobile');

//Remove when left menu is in place
var FastClick = require('fastclick');

//Left Menu Additions
//var gestures              = require('utils/gesture-controller');

require('utils/tracking');

/* Set the timezone cookie */
require('components/timezone-cookie');

// Preload widgets
require('./views/widgets/avatar');
require('./components/ping');
require('./components/eyeballs-room-sync');
require('./template/helpers/all');
require('./utils/gesture-controller');

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

  var repoCollection = new RepoCollection();


  var appView = new MobileLayout({
    model: context.troupe(),
    template: false,
    el: 'body',
    chatCollection: chatCollection,
    //Left Menu Additions
    //roomCollection: troupeCollections.troupes
    orgCollection: troupeCollections.orgs,
    repoCollection: repoCollection,
    groupsCollection: troupeCollections.groups
  });
  appView.render();


  var createGroupAndRoomRoutes = generateCreateGroupAndRoomRoutes(appView, {
    groupCollection: troupeCollections.groups,
    roomCollection: troupeCollections.troupes,
    orgCollection: troupeCollections.orgs,
    repoCollection: repoCollection
  });

  var Router = Backbone.Router.extend({
    routes: {
      "": "hideModal",
      "notifications": "notifications",
      'notification-defaults': 'notificationDefaults',
      'createroom': 'createRoom',
      'createroom/:name': 'createRoom',
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

    createRoom: createGroupAndRoomRoutes.createRoom,
    createCommunity: createGroupAndRoomRoutes.createCommunity
  });

  new Router();

  $('html').removeClass('loading');

  Backbone.history.start();
});
