"use strict";
var UserHomeView = require('views/userhome/userHomeView');
var $ = require('jquery');
var appEvents = require('utils/appevents');
var Backbone = require('backbone');
var TroupeMenu = require('views/menu/troupeMenu');
var MobileAppView = require('views/app/mobileAppView');
var confirmRepoRoomView = require('views/createRoom/confirmRepoRoomView');
var modalRegion = require('components/modal-region');
var onready = require('./utils/onready');

// Preload widgets
require('views/widgets/avatar');

onready(function() {

  appEvents.on('navigation', function(url) {
    window.location.href = url;
  });

  new MobileAppView({
    el: $('#mainPage')
  });

  new TroupeMenu({
    el: $('#troupeList')
  }).render();

  new UserHomeView({
    el: $('#content-frame')
  }).render();

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

  $('html').removeClass('loading');
});

