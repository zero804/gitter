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
require('components/ping');

onready(function() {

  require('components/link-handler').installLinkHandler();
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
    el: $('#userhome')
  }).render();

  var Router = Backbone.Router.extend({
    routes: {
      'confirmSuggested/*uri': function(uri) {
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

