"use strict";

var appEvents       = require('utils/appevents');
var context         = require('utils/context');
var TitlebarUpdater = require('components/titlebar');
var onready         = require('./utils/onready');
var debug           = require('debug-proxy')('app:router-nli-app');

require('views/widgets/preload');
require('components/user-notifications');
require('template/helpers/all');
require('components/bug-reporting');
require('utils/tracking');
require('components/ping');

// Preload widgets
require('views/widgets/avatar');


onready(function() {
  require('components/link-handler').installLinkHandler();

  appEvents.on('navigation', function(url/*, type, title*/) {
    window.location = url;
  });

  var chatIFrame = document.getElementById('content-frame');
  if(window.location.hash) {
    var noHashSrc = chatIFrame.src.split('#')[0];
    chatIFrame.src = noHashSrc + window.location.hash;
  }

  /* Replace the `null` state on startup with the real state, so that when a client clicks back to the
   * first page of gitter, we know what the original URL was (instead of null)
   */
  window.history.replaceState(chatIFrame.src, '', window.location.href);

  function pushState(state, title, url) {
    window.history.pushState(state, title, url);
    appEvents.trigger('track', url);
  }

  // var appView = new AppIntegratedView({ });

  // appView.leftMenuRegion.show(new TroupeMenuView({ }));

  function updateContent(state) {
    if(state) {
      // TODO: update the title....
      context.setTroupeId(undefined);
      var hash;
      var windowHash = window.location.hash;
      if(!windowHash || windowHash === '#') {
        hash = '#initial';
      } else {
        hash = windowHash;
      }
      chatIFrame.contentWindow.location.replace(state + hash);
    }
  }

  var titlebarUpdater = new TitlebarUpdater();

  // var allRoomsCollection = troupeCollections.troupes;
  // allRoomsCollection.on("remove", function(model) {
  //   if(model.id == context.getTroupeId()) {
  //     var username = context.user().get('username');
  //     var newLocation = '/' + username;
  //     var newFrame = newLocation + '/~home';
  //     var title = '';

  //     titlebarUpdater.setRoomName(title);

  //     pushState(newFrame, title, newLocation);
  //     updateContent(newFrame);
  //   }
  // });


  appEvents.on('navigation', function(url, type, title) {
    // This is a bit hacky..
    // Add a /-/ if the path only has one component
    // so /moo/ goes to /moo/-/chat but
    // /moo/foo goes to /moo/foo/chat
    var frameUrl = url + '/~' + type;

    pushState(frameUrl, title, url);
    titlebarUpdater.setRoomName(title);
    updateContent(frameUrl);
  });

  // Revert to a previously saved state
  window.onpopstate = function(e) {
    updateContent(e.state || window.location.pathname + '/~chat');
    appEvents.trigger('track', window.location.pathname + window.location.hash);
    return true;
  };

  window.addEventListener('message', function(e) {
    if(e.origin !== context.env('basePath')) {
      debug('Ignoring message from %s', e.origin);
      return;
    }

    var message;
    try {
      message = JSON.parse(e.data);
    } catch(err) {
      return; // Ignore non-json from extensions
    }

    debug('Received message %j', message);

    switch(message.type) {
      case 'context.troupeId':
        context.setTroupeId(message.troupeId);
        titlebarUpdater.setRoomName(message.name);
        break;

      case 'navigation':
        appEvents.trigger('navigation', message.url, message.urlType, message.title);
        break;

      case 'route':
        window.location.hash = '#' + message.hash;
        break;

      // case 'realtime.testConnection':
      //   var reason = message.reason;
      //   realtime.testConnection('chat.' + reason);
      //   break;

      case 'permalink.requested':
        var url = message.url + '?at=' + message.id;
        var frameUrl = message.url + '/~' + message.permalinkType + '?at=' + message.id;
        var title = message.url.substring(1);
        pushState(frameUrl, title, url);
        break;
    }
  });

});
