'use strict';

require('./utils/font-setup');

var Backbone = require('backbone');
var urlParse = require('url-parse');
var clientEnv = require('gitter-client-env');
var appEvents = require('./utils/appevents');
var context = require('gitter-web-client-context');
const generatePermalink = require('gitter-web-shared/chat/generate-permalink');
var onready = require('./utils/onready');
const userNotifications = require('./components/user-notifications');
var TitlebarUpdater = require('./components/titlebar');
var debug = require('debug-proxy')('app:router-nli-app');
var modalRegion = require('./components/modal-region');
var Router = require('./routes/router');
const pushState = require('./utils/browser/pushState');
const replaceState = require('./utils/browser/replaceState');

require('./views/widgets/preload');
require('./template/helpers/all');
require('./components/bug-reporting');
require('./utils/tracking');
require('./components/ping');

// Preload widgets
require('./views/widgets/avatar');

userNotifications.initUserNotifications();

onready(function() {
  // eslint-disable-next-line no-unused-vars
  var router = new Router({
    dialogRegion: modalRegion,
    routes: [
      {
        login: function(query) {
          var dialogRegion = this.dialogRegion;

          require.ensure(['./views/modals/login-view'], function(require) {
            var LoginView = require('./views/modals/login-view');

            var options = query ? urlParse('?' + query, true).query : {};
            dialogRegion.show(new LoginView(options));
          });
        }
      }
    ]
  });

  Backbone.history.start();

  require('./components/link-handler').installLinkHandler();

  appEvents.on('navigation', function(url /*, type, title*/) {
    window.location = url;
  });

  var chatIFrame = document.getElementById('content-frame');
  if (window.location.hash) {
    var noHashSrc = chatIFrame.src.split('#')[0];
    chatIFrame.src = noHashSrc + window.location.hash;
  }

  /* Replace the `null` state on startup with the real state, so that when a client clicks back to the
   * first page of gitter, we know what the original URL was (instead of null)
   */
  replaceState(window.location.href, '');

  function updateContent(state) {
    if (state) {
      // TODO: update the title....
      context.setTroupeId(undefined);
      var hash;
      var windowHash = window.location.hash;
      if (!windowHash || windowHash === '#') {
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

  appEvents.on('route', function(hash) {
    window.location.hash = `#${hash}`;
  });

  appEvents.on('navigation', function(url, type, title) {
    // This is a bit hacky..
    // Add a /-/ if the path only has one component
    // so /moo/ goes to /moo/-/chat but
    // /moo/foo goes to /moo/foo/chat
    // FIXME: remove the iframe logic from router-nli-app
    var frameUrl = url + '/~' + type;

    pushState(url, title);
    titlebarUpdater.setRoomName(title);
    updateContent(frameUrl);
  });

  appEvents.on('permalink.requested', function(type, chat) {
    const troupeUrl = context.troupe().get('url');
    const permalinkUrl = generatePermalink(troupeUrl, chat.id);
    pushState(permalinkUrl);
  });

  // Revert to a previously saved state
  window.onpopstate = function(e) {
    updateContent(e.state /* || window.location.pathname + '/~chat'*/);
    appEvents.trigger('track', window.location.pathname + window.location.hash);
    return true;
  };

  window.addEventListener('message', function(e) {
    if (e.origin !== clientEnv['basePath']) {
      debug('Ignoring message from %s', e.origin);
      return;
    }

    var message;
    try {
      message = JSON.parse(e.data);
    } catch (err) {
      return; // Ignore non-json from extensions
    }

    debug('Received message %j', message);

    switch (message.type) {
      case 'context.troupeId':
        context.setTroupeId(message.troupeId);
        titlebarUpdater.setRoomName(message.name);
        break;

      // case 'route-silent':
      //   var routeCb = router.routes[message.hash];
      //   if(routeCb) {
      //     routeCb.apply(router, message.args);
      //   }
      //   break;
    }
  });

  setTimeout(function() {
    var serviceWorkerDeregistration = require('gitter-web-service-worker/browser/deregistration');
    serviceWorkerDeregistration.uninstall();
  }, 5000);
});
