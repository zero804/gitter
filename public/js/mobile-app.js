"use strict";

var context = require('utils/context');
var $ = require('jquery');
var appEvents = require('utils/appevents');
var chatModels = require('collections/chat');
var Backbone = require('backbone');
var onready = require('./utils/onready');
var MobileLayout = require('views/layouts/mobile');
var FastClick = require('fastclick');
var RoomCollectionTracker = require('components/room-collection-tracker');
var troupeCollections = require('collections/instances/troupes');
var unreadItemsClient = require('components/unread-items-client');

require('utils/tracking');

/* Set the timezone cookie */
require('components/timezone-cookie');

// Preload widgets
require('views/widgets/avatar');
require('components/ping');
require('components/eyeballs');
require('template/helpers/all');

onready(function() {
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

  var appView = new MobileLayout({ model: context.troupe(), template: false, el: 'body', chatCollection: chatCollection });
  appView.render();

  var Router = Backbone.Router.extend({
    routes: {
      "": "hideModal",
      "notifications": "notifications"
    },

    hideModal: function() {
      appView.dialogRegion.destroy();
    },

    notifications: function() {
      require.ensure(['views/modals/room-settings-view'], function(require) {
        var TroupeSettingsView = require('views/modals/room-settings-view');
        appView.dialogRegion.show(new TroupeSettingsView({}));
      });
    }
  });

  new Router();

  $('html').removeClass('loading');

  Backbone.history.start();
});
