"use strict";

var $ = require('jquery');
var appEvents = require('./utils/appevents');
var chatModels = require('./collections/chat');
var onready = require('./utils/onready');
var MobileNliLayout = require('./views/layouts/mobile-nli-layout');
var FastClick = require('fastclick');
require('./utils/tracking');

// Preload widgets
require('./views/widgets/avatar');
require('./components/ping');
require('./template/helpers/all');

onready(function() {
  FastClick.attach(document.body);

  require('./components/link-handler').installLinkHandler();
  appEvents.on('navigation', function(url) {
    window.location.href = url;
  });

  var chatCollection = new chatModels.ChatCollection(null, { listen: true });
  var appView = new MobileNliLayout({ template: false, el: 'body', chatCollection: chatCollection });
  appView.render();

  $('html').removeClass('loading');


});
