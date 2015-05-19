"use strict";
var $ = require('jquery');
var appEvents = require('utils/appevents');
var Backbone = require('backbone');
var confirmRepoRoomView = require('views/createRoom/confirmRepoRoomView');
var modalRegion = require('components/modal-region');
var onready = require('./utils/onready');
var MobileUserhomeLayout = require('views/layouts/mobile-userhome');

// Preload widgets
require('views/widgets/avatar');
require('components/ping');

onready(function() {

  require('components/link-handler').installLinkHandler();
  appEvents.on('navigation', function(url) {
    window.location.href = url;
  });

  new MobileUserhomeLayout({
    template: false,
    el: 'body'
  }).render();

  var Router = Backbone.Router.extend({
    routes: {
      'confirmSuggested/*uri': function(uri) {
        modalRegion.show(new confirmRepoRoomView.Modal({ uri: uri }));
      },
      '': function() {
        modalRegion.destroy();
      }
    }
  });

  new Router();
  Backbone.history.start();

  $('html').removeClass('loading');
});

