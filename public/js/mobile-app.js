"use strict";
var $ = require('jquery');
var appEvents = require('utils/appevents');
var chatModels = require('collections/chat');
var Backbone = require('backbone');
var TroupeSettingsView = require('views/app/troupeSettingsView');
var onready = require('./utils/onready');
var MobileLayout = require('views/layouts/mobile');
var FastClick = require('fastclick');
var RoomCollectionTracker = require('components/room-collection-tracker');
var troupeCollections = require('collections/instances/troupes');

/* Set the timezone cookie */
require('components/timezone-cookie');

// Preload widgets
require('views/widgets/avatar');
require('views/widgets/timeago');
require('components/ping');
require('template/helpers/all');

onready(function() {
  FastClick.attach(document.body);

  require('components/link-handler').installLinkHandler();
  appEvents.on('navigation', function(url) {
    window.location.href = url;
  });

  new RoomCollectionTracker(troupeCollections.troupes);

  var chatCollection = new chatModels.ChatCollection(null, { listen: true });
  var appView = new MobileLayout({ template: false, el: 'body', chatCollection: chatCollection });
  appView.render();

  var Router = Backbone.Router.extend({
    routes: {
      // TODO: get rid of the pipes
      "!": "hideModal",                  // TODO: remove this soon
      "": "hideModal",
      "notifications": "notifications",
      "|notifications": "notifications", // TODO: remove this soon
    },

    hideModal: function() {
      appView.dialogRegion.destroy();
    },

    notifications: function() {
      appView.dialogRegion.show(new TroupeSettingsView({}));
    }
  });

  new Router();

  $('html').removeClass('loading');

  Backbone.history.start();
});
