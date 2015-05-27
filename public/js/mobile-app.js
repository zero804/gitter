"use strict";
var $ = require('jquery');
var appEvents = require('utils/appevents');
var chatModels = require('collections/chat');
var unreadItemsClient = require('components/unread-items-client');
var Backbone = require('backbone');
var TroupeSettingsView = require('views/app/troupeSettingsView');
var onready = require('./utils/onready');
var MobileLayout = require('views/layouts/mobile');
var FastClick = require('fastclick');

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

  var chatCollection = new chatModels.ChatCollection(null, { listen: true });
  var appView = new MobileLayout({ template: false, el: 'body', chatCollection: chatCollection });
  appView.render();

  unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));


  var Router = Backbone.Router.extend({
    routes: {
      // TODO: get rid of the pipes
      "!": "hideModal",                  // TODO: remove this soon
      "": "hideModal",
      "notifications": "notifications",
      "|notifications": "notifications", // TODO: remove this soon
    },

    hideModal: function() {
      appView.modalRegion.destroy();
    },

    notifications: function() {
      appView.modalRegion.show(new TroupeSettingsView({}));
    }
  });

  new Router();

  $('html').removeClass('loading');

  Backbone.history.start();
});
