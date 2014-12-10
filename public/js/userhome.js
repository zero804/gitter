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

  appEvents.on('navigation', function(url) {
    if(url.indexOf('#') === 0) {
      window.location.hash = url;
    } else {
      (window.parent || window).location.href = url;
    }
  });

  var Router = Backbone.Router.extend({
    routes: {
      'confirm/*uri': function(uri) {
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

