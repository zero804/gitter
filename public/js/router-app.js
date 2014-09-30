require([
  'require',
  'utils/appevents',
  'utils/context',
  'backbone',
  'underscore',
  'views/app/appIntegratedView',
  'views/menu/troupeMenu',
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
  'components/ajax-errors',               // No ref
  'components/focus-events'               // No ref
], function(require, appEvents, context, Backbone, _, AppIntegratedView, TroupeMenuView, troupeCollections,
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

  function updateContent(iframeUrl) {
    // TODO: update the title....
    context.setTroupeId(undefined);
    var hash;
    var windowHash = window.location.hash;
    if(!windowHash || windowHash === '#') {
      hash = '#initial';
    } else {
      hash = windowHash;
    }
    chatIFrame.contentWindow.location.replace(iframeUrl + hash);
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
  // when clicking on a chat notification
  window.gitterLoader = function(url) {
    var title = url.replace(/^\//,'');
    appEvents.trigger('navigation', url, 'chat', title);
  };

  appEvents.on('navigation', function(url, type, title) {
    var frameUrl = url + '/~' + type;

    pushState(frameUrl, title, url);
    titlebarUpdater.setRoomName(title);
    updateContent(frameUrl);
  });

  // Revert to a previously saved state
  window.onpopstate = function(e) {
    var iframeUrl = e.state;

    if(!iframeUrl) {
      // state is new i.e first page in history or new navigation
      // so we have to guess the iframe url
      var type = context.user().get('url') === window.location.pathname ? 'home' : 'chat';
      iframeUrl = window.location.pathname + '/~' + type;
    }

    updateContent(iframeUrl);
    appEvents.trigger('track', window.location.pathname + window.location.hash);
    return true;
  };

  window.addEventListener('message', function(e) {
    if(e.origin !== context.env('basePath')) {
      log('Ignoring message from ' + e.origin);
      return;
    }

    var message;
    try {
      message = JSON.parse(e.data);
    } catch(err) {
      /* It seems as through chrome extensions use this event to pass messages too. Ignore them. */
      return;
    }

    log('Received message ', message);

    var makeEvent = function(message) {
      var origin = 'chat';
      if (message.event && message.event.origin) origin = message.event.origin;
      message.event = {
        origin: origin,
        preventDefault: function() {
          log('Warning: could not call preventDefault() because the event comes from the `' + this.origin + '` frame, it must be called from the original frame');
        },
        stopPropagation: function() {
          log('Warning: could not call stopPropagation() because the event comes from the `' + this.origin + '` frame, it must be called from the original frame');
        },
        stopImmediatePropagation: function() {
          log('Warning: could not call stopImmediatePropagation() because the event comes from the `' + this.origin + '` frame, it must be called from the original frame');
        }
      };
    };

    switch(message.type) {
      case 'context.troupeId':
        context.setTroupeId(message.troupeId);
        titlebarUpdater.setRoomName(message.name);
        appEvents.trigger('context.troupeId', message.troupeId);
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

      // No parameters
      case 'chat.edit.hide':
      case 'chat.edit.show':
      case 'ajaxError':
        appEvents.trigger(message.type);
        break;

      case 'keyboard':
        makeEvent(message);
        appEvents.trigger('keyboard.' + message.name, message.event, message.handler);
        appEvents.trigger('keyboard.all', message.name, message.event, message.handler);
        break;

      case 'focus':
        makeEvent(message);
        appEvents.trigger('focus.request.' + message.focus, message.event);
        break;
    }
  });

  function postMessage(message) {
    chatIFrame.contentWindow.postMessage(JSON.stringify(message), context.env('basePath'));
  }

  // Call preventDefault() on tab events so that we can manage focus as we want
  appEvents.on('keyboard.tab.next keyboard.tab.prev', function(e) {
    if (!e.origin) e.preventDefault();
  });

  // Send focus events to chat frame
  appEvents.on('focus.request.chat.in', function(event) {
    postMessage({type: 'focus', focus: 'in', event: event});
  });
  appEvents.on('focus.request.chat.out', function(event) {
    postMessage({type: 'focus', focus: 'out', event: event});
  });

  // Sent keyboard events to chat frame
  appEvents.on('keyboard.all', function (name, event, handler) {
    // Don't send back events coming from the chat frame
    if (event.origin && event.origin === 'chat') return;
    var message = {
      type: 'keyboard',
      name: name,
      // JSON serialisation makes it not possible to send the event object
      // Keep track of the origin in case of return
      event: {origin: event.origin},
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

  if (context.popEvent('new_user_signup')) {
    require(['twitter-oct'], function (twitterOct) {
      twitterOct.trackPid('l4t99');
    });
  }

});
