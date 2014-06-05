/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'utils/appevents',
  'utils/context',
  'backbone',
  'underscore',
  'views/app/appIntegratedView',
  'views/toolbar/troupeMenu',
  'collections/instances/troupes',
  'components/titlebar',
  'components/realtime',
  'views/createRoom/createRoomView',
  'views/createRoom/createRepoRoomView',
  'views/createRoom/chooseRoomView',
  'log!router-app',
  'components/statsc',                    // No ref
  'views/widgets/preload',                // No ref
  'components/webNotifications',          // No ref
  'components/desktopNotifications',      // No ref
  'template/helpers/all',                 // No ref
  'components/bug-reporting',             // No ref
  'components/csrf',                      // No ref
  'components/ajax-errors'                // No ref
], function(appEvents, context, Backbone, _, AppIntegratedView, TroupeMenuView, troupeCollections,
  TitlebarUpdater, realtime, createRoomView, createRepoRoomView, chooseRoomView, log) {
  "use strict";

  var chatIFrame = document.getElementById('content-frame');
  if(window.location.hash) {
    var noHashSrc = chatIFrame.src.split('#')[0];
    chatIFrame.src = noHashSrc + window.location.hash;
  }

  function pushState(state, title, url) {
    window.history.pushState(state, title, url);
    appEvents.trigger('track', url);
  }

  var appView = new AppIntegratedView({ });

  appView.leftMenuRegion.show(new TroupeMenuView({ }));

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
      chatIFrame.contentWindow.location.assign(state + hash);
    }
  }

  var titlebarUpdater = new TitlebarUpdater();

  var allRoomsCollection = troupeCollections.troupes;
  allRoomsCollection.on("remove", function(model) {
    if(model.id == context.getTroupeId()) {
      var username = context.user().get('username');
      var newLocation = '/' + username;
      var newFrame = newLocation + '/~home';
      var title = '';

      titlebarUpdater.setRoomName(title);

      pushState(newFrame, title, newLocation);
      updateContent(newFrame);
    }
  });

  // Called from the OSX native client for faster page loads

  window.gitterLoader = function(url) {
    var frameUrl = url + '/~chat';
    titlebarUpdater.setRoomName(url);

    pushState(frameUrl, url, url);
    updateContent(frameUrl);
  };

  appEvents.on('navigation', function(url, type, title) {
    // This is a bit hacky..
    // Add a /-/ if the path only has one component
    // so /moo/ goes to /moo/-/chat but
    // /moo/foo goes to /moo/foo/chat
    var frameUrl = url + '/~' + type;
    titlebarUpdater.setRoomName(title);

    pushState(frameUrl, title, url);
    updateContent(frameUrl);
  });

  // Revert to a previously saved state
  window.onpopstate = function(e) {
    updateContent(e.state);
    appEvents.trigger('track', window.location.pathname + window.location.hash);
    return true;
  };

  window.addEventListener('message', function(e) {
    if(e.origin !== context.env('basePath')) {
      log('Ignoring message from ' + e.origin);
      return;
    }

    var message = JSON.parse(e.data);
    log('Received message ', message);

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

      case 'unreadItemsCount':
        var count = message.count;
        var troupeId = message.troupeId;
        if(troupeId !== context.getTroupeId()) {
          log('warning: troupeId mismatch in unreadItemsCount');
        }
        var v = {
          unreadItems: count
        };

        if(count === 0) {
          // If there are no unread items, there can't be unread mentions
          // either
          v.mentions = 0;
        }

        allRoomsCollection.patch(troupeId, v);
        break;

      case 'realtime.testConnection':
        var reason = message.reason;
        realtime.testConnection('chat.' + reason);
        break;

      case 'keyboard':
        appEvents.trigger('keyboard.' + message.name, message.event, message.handler);
        appEvents.trigger('keyboard.all', message.name, message.event, message.handler);
        break;
    }
  });

  function postMessage(message) {
    chatIFrame.contentWindow.postMessage(JSON.stringify(message), context.env('basePath'));
  }

  // Sent keyboard events to chat frame
  appEvents.on('keyboard.all', function (name, event, handler) {
    // Don't send back events coming from the chat frame
    if (event.origin && event.origin === 'chat') return;
    var message = {
      type: 'keyboard',
      name: name,
      // JSON serialisation makes it not possible to send the event object
      event: {
        origin: 'app'
      },
      handler: handler
    };
    postMessage(message);
  });

  function reallyOnce(emitter, name, callback, context) {
    var once = _.once(function() {
      emitter.off(name, once);
      callback.apply(context, arguments);
    });

    once._callback = callback;
    return emitter.once(name, once);
  }

  var Router = Backbone.Router.extend({
    routes: {
      // TODO: get rid of the pipes
      "": "hideModal",
      "createcustomroom": "createcustomroom",
      "createcustomroom/:name": "createcustomroom",
      "createreporoom": "createreporoom",
      "createroom" : "createroom"
    },

    hideModal: function() {
      appView.dialogRegion.close();
    },

    createroom: function() {
      appView.dialogRegion.show(new chooseRoomView.Modal());
    },

    createcustomroom: function(name) {
      /* Figure out who's the daddy */

      function getParentUri(troupe) {
        if(troupe.get('oneToOne') === true) {
          return context.user().get('username');
        }

        if(troupe.get('githubType') === 'REPO' || troupe.get('githubType') === 'ORG') {
          return troupe.get('uri');
        }

        return troupe.get('uri').split('/').slice(0, -1).join('/');
      }

      function showWithOptions(options) {
        appView.dialogRegion.show(new createRoomView.Modal(options));
      }

      var uri = window.location.pathname.split('/').slice(1).join('/');
      if(uri === context.user().get('username')) {
        showWithOptions({ initialParent: uri, roomName: name });
      }

      var current = allRoomsCollection.findWhere({ url: '/' + uri });
      if(!current) {
        reallyOnce(allRoomsCollection, 'reset sync', function() {
          current = allRoomsCollection.findWhere({ url: '/' + uri });
          if(current) {
            uri = getParentUri(current);
            showWithOptions({ initialParent: uri, roomName: name });
          } else {
            showWithOptions({ roomName: name });
          }
        });
        return;
      }

      uri = getParentUri(current);
      showWithOptions({ initialParent: uri, roomName: name });
    },

    createreporoom: function() {
      appView.dialogRegion.show(new createRepoRoomView.Modal());
    }
  });

  new Router();
  Backbone.history.start();

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function(/*tracking*/) {
    // No need to do anything here
  });
});
