"use strict";
var $                    = require('jquery');
var appEvents            = require('utils/appevents');
var Backbone             = require('backbone');
var confirmRepoRoomView  = require('views/modals/confirm-repo-room-view.js');
var modalRegion          = require('components/modal-region');
var onready              = require('./utils/onready');
var MobileUserhomeLayout = require('views/layouts/mobile-userhome');

//Left Menu Additions
//var gestures             = require('utils/gesture-controller');

//Remove when Lef Menu is in
var FastClick = require('fastclick');

require('utils/tracking');

// Preload widgets
require('views/widgets/avatar');
require('components/ping');
require('template/helpers/all');

onready(function() {

  //Left Menu Additions
  //gestures.init();

  //Remove for Left Menu
  FastClick.attach(document.body);

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
