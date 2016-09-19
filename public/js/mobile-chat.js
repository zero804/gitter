"use strict";

var $ = require('jquery');
var Backbone = require('backbone');
var context = require('./utils/context');
var appEvents = require('./utils/appevents');
var onready = require('./utils/onready');

var chatModels = require('./collections/chat');
var troupeCollections = require('./collections/instances/troupes');
var unreadItemsClient = require('./components/unread-items-client');
var RoomCollectionTracker = require('./components/room-collection-tracker');
var MobileLayout = require('./views/layouts/mobile');
var Router = require('./routes/router');
var createRoutes = require('./routes/create-routes');
var roomRoutes = require('./routes/room-routes');

//Remove when left menu is in place
var FastClick = require('fastclick');

//Left Menu Additions
//var gestures              = require('./utils/gesture-controller');

require('./utils/tracking');

/* Set the timezone cookie */
require('./components/timezone-cookie');

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

  require('./components/link-handler').installLinkHandler();
  appEvents.on('navigation', function(url) {
    window.location.href = url;
  });

  new RoomCollectionTracker(troupeCollections.troupes);

  var chatCollection = new chatModels.ChatCollection(null, { listen: true });

  unreadItemsClient.syncCollections({
    'chat': chatCollection
  });

  appEvents.on('route', function(fragment) {
    window.location.hash = '#' + fragment;
  });

  var appView = new MobileLayout({
    model: context.troupe(),
    template: false,
    el: 'body',
    chatCollection: chatCollection,
    //Left Menu Additions
    //roomCollection: troupeCollections.troupes
    orgCollection: troupeCollections.orgs,
    groupsCollection: troupeCollections.groups
  });
  appView.render();

  new Router({
    dialogRegion: appView.dialogRegion,
    routes: [
      roomRoutes({
        rosterCollection: null,
        // TODO: remove these two options:
        // https://github.com/troupe/gitter-webapp/issues/2211
        rooms: null,
        groups: null
      }),
      createRoutes({
        rooms: troupeCollections.troupes,
        groups: troupeCollections.groups,
        roomMenuModel: null
      }),
    ]
  });

  $('html').removeClass('loading');

  Backbone.history.start();
});
