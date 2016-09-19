"use strict";
var $ = require('jquery');
var appEvents = require('./utils/appevents');
var Backbone = require('backbone');
var modalRegion = require('./components/modal-region');
var onready = require('./utils/onready');
var MobileUserhomeLayout = require('./views/layouts/mobile-userhome');
var Router = require('./routes/router');
var createRoutes = require('./routes/create-routes');
var confirmSuggestedRoutes = require('./routes/confirm-suggestion-routes');

//Left Menu Additions
//var gestures             = require('./utils/gesture-controller');

//Remove when Left Menu is in
var FastClick = require('fastclick');

require('./utils/tracking');

// Preload widgets
require('./views/widgets/avatar');
require('./components/ping');
require('./template/helpers/all');

onready(function() {

  //Left Menu Additions
  //gestures.init();

  //Remove for Left Menu
  FastClick.attach(document.body);

  require('./components/link-handler').installLinkHandler();
  appEvents.on('navigation', function(url) {
    window.location.href = url;
  });

  new MobileUserhomeLayout({
    template: false,
    el: 'body'
  }).render();


  new Router({
    dialogRegion: modalRegion,
    routes: [
      createRoutes({
        rooms: null, //troupeCollections.troupes,
        groups: null, // troupeCollections.groups,
        roomMenuModel: null
      }),
      confirmSuggestedRoutes()
    ]
  });

  Backbone.history.start();

  $('html').removeClass('loading');
});
