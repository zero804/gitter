'use strict';

var $ = require('jquery');
var onready = require('./utils/onready');
var appEvents = require('./utils/appevents');
var MobileAppLayout = require('./views/layouts/mobile-app');
var clientEnv = require('gitter-client-env');

//Remove when Left Menu is in
var FastClick = require('fastclick');

require('./utils/font-setup');
require('gitter-web-frame-utils');
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

  window.addEventListener('message', function(e){
    if (e.origin !== clientEnv.basePath) { return; }

    var message;
    try {
      message = JSON.parse(e.data);
    }
    catch (err) { return; }

    switch (message.type) {
      case 'navigation':
        var url = message.url;
        pushState(url, message.title, url)
        break;
    }

  });

  new MobileAppLayout({
    template: false,
    el: 'body'
  }).render();
});

function pushState(state, title, url) {
  if (state === window.history.state) {
    // Don't repush the same state...
    return;
  }

  window.history.pushState(state, title, url);
}
