"use strict";
var UserHomeView = require('views/userhome/userHomeView');
var appEvents = require('utils/appevents');
var Backbone = require('backbone');
var confirmRepoRoomView = require('views/createRoom/confirmRepoRoomView');
var modalRegion = require('components/modal-region');
var onready = require('./utils/onready');

require('utils/tracking');

// Preload widgets
require('views/widgets/avatar');
require('views/widgets/timeago');

onready(function() {
  new UserHomeView({ el: '#userhome' }).render();

  require('components/link-handler').installLinkHandler();
  appEvents.on('navigation', function(url) {
    // No pushState here. Open links within the parent...
    // Remember that (window.parent === window) when there is no parent frame
    window.parent.location.href = url;
  });


  var Router = Backbone.Router.extend({
    routes: {
      'confirmSuggested/*uri': function (uri) {
        modalRegion.show(new confirmRepoRoomView.Modal({ uri: uri }));
      },
      '': function() {
        modalRegion.close();
      }
    }
  });

  new Router();
  Backbone.history.start();
});

