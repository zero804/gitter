"use strict";

var appEvents = require('utils/appevents');
var Backbone = require('backbone');
var context = require('utils/context');
// var ChatNliIntegratedView = require('views/app/chatNliIntegratedView');
var itemCollections = require('collections/instances/integrated-items');
// var RightToolbarView = require('views/righttoolbar/rightToolbarView');
var PeopleModal = require('views/people/people-modal');
var HeaderView = require('views/app/headerView');
var onready = require('./utils/onready');
var ChatToolbarLayout = require('views/layouts/chat-toolbar');

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

  // TODO: add this to the appView
  new HeaderView({ model: context.troupe(), el: '#header' });

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
