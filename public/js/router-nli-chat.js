"use strict";

var appEvents = require('utils/appevents');
var Backbone = require('backbone');
var itemCollections = require('collections/instances/integrated-items');
var PeopleModal = require('views/people/people-modal');
var onready = require('./utils/onready');
var ChatToolbarLayout = require('views/layouts/chat-toolbar');

/* Set the timezone cookie */
require('components/timezone-cookie');

require('views/widgets/preload');
require('filtered-collection');
require('components/dozy');
require('template/helpers/all');
require('components/bug-reporting');

// Preload widgets
require('views/widgets/avatar');
require('views/widgets/timeago');
require('components/ping');

onready(function() {

  require('components/link-handler').installLinkHandler();

  appEvents.on('navigation', function(url) {
    // No pushState here. Open links within the parent...
    window.parent.location.href = url;
  });

  var appView = new ChatToolbarLayout({ template: false, el: 'body', chatCollection: itemCollections.chats });
  appView.render();

  var Router = Backbone.Router.extend({
    routes: {
      "": "hideModal",
      "people": "people",
    },

    hideModal: function() {
      appView.dialogRegion.destroy();
    },

    people: function() {
      appView.dialogRegion.show(new PeopleModal());
    },

  });

  new Router();

  // // Listen for changes to the room
  // liveContext.syncRoom();

  Backbone.history.start();

});
