'use strict';

var $ = require('jquery');
var onready = require('./utils/onready');
var appEvents = require('./utils/appevents');
var MobileAppLayout = require('./views/layouts/mobile-app');

//Remove when Left Menu is in
var FastClick = require('fastclick');

require('./utils/font-setup');
require('./utils/frame-utils');
require('./utils/tracking');

// Preload widgets
require('./views/widgets/avatar');
require('./template/helpers/all');

onready(function() {
  $('html').removeClass('loading');

  //Remove for Left Menu
  FastClick.attach(document.body);

  require('./components/link-handler').installLinkHandler();
  appEvents.on('navigation', function(url) {
    window.location.href = url;
  });

  new MobileAppLayout({
    template: false,
    el: 'body'
  }).render();
});
