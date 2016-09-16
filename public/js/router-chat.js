'use strict';
require('./utils/initial-setup');
require('./utils/font-setup');

var Backbone = require('backbone');
var context = require('./utils/context');
var clientEnv = require('gitter-client-env');
var debug = require('debug-proxy')('app:router-chat');
var fullTimeFormat = require('gitter-web-shared/time/full-time-format');

var onready = require('./utils/onready');
var appEvents = require('./utils/appevents');
var frameUtils = require('./utils/frame-utils');
var liveContext = require('./components/live-context');
var apiClient = require('./components/apiClient');
var perfTiming = require('./components/perf-timing');
var itemCollections = require('./collections/instances/integrated-items');
var chatCollection = require('./collections/instances/chats-cached');
var troupeCollections = require('./collections/instances/troupes');
var ChatToolbarInputLayout = require('./views/layouts/chat-toolbar-input');
var DropTargetView = require('./views/app/dropTargetView');
var Router = require('./routes/router');
var roomRoutes = require('./routes/room-routes');
var notificationRoutes = require('./routes/notification-routes');

/* Set the timezone cookie */
require('./components/timezone-cookie');

require('./components/statsc');
require('./views/widgets/preload');
require('./components/dozy');
require('./template/helpers/all');
require('./components/eyeballs-room-sync');
require('./components/bug-reporting');
require('./components/focus-events');

// Preload widgets
require('./components/ping');

onready(function() {

  appEvents.on('navigation', function(url, type, title, options) {
    options = options || {};

    if(!url && options.refresh) {
      window.location.reload();
      return;
    }

    if (frameUtils.hasParentFrameSameOrigin()) {
      frameUtils.postMessage({ type: 'navigation', url: url, urlType: type, title: title});
    } else {
      // No pushState here. Open the link directly
      // Remember that (window.parent === window) when there is no parent frame
      window.parent.location.href = url;
    }
 });

  require('./components/link-handler').installLinkHandler();

  function parsePostMessage(e) {
    // Shortcut for performance
    if (!e || !e.data || typeof e.data !== 'string') return;

    if (e.origin !== clientEnv.basePath) {
      debug('Ignoring message from ' + e.origin);
      return;
    }

    try {
      return JSON.parse(e.data);
    } catch (err) {
      /* It seems as through chrome extensions use this event to pass messages too. Ignore them. */
      return;
    }
  }

  window.addEventListener('message', function(e) {
    var message = parsePostMessage(e);
    if (!message) return;

    debug('Received message %j', message);

    var makeEvent = function(message) {
      var origin = 'app';
      if (message.event && message.event.origin) origin = message.event.origin;
      message.event = {
        origin: origin,
        preventDefault: function() {
        },

        stopPropagation: function() {
        },

        stopImmediatePropagation: function() {
        },
      };
    };

    switch (message.type) {
      case 'keyboard':
        makeEvent(message);
        appEvents.trigger('keyboard.' + message.name, message.event, message.handler);
        appEvents.trigger('keyboard.all', message.name, message.event, message.handler);
      break;

      case 'focus':
        makeEvent(message);
        appEvents.trigger('focus.request.' + message.focus, message.event);
      break;

      case 'permalink.navigate':
        var query = message.query;
        /* Only supports at for now..... */
        var aroundId = query && query.at;

        if (aroundId) {
          appEvents.trigger('chatCollectionView:permalinkHighlight', aroundId);
        }

      break;

      case 'change:room':
        perfTiming.start('room-switch.render');

        debug('changing room: %j', message.newTroupe);

        // destroy any modal views
        router.navigate('', { trigger: true, replace: true });

        //set the context troupe to new troupe
        context.setTroupe(message.newTroupe);

        if (message.permalinkChatId) {
          appEvents.trigger('chatCollectionView:permalinkHighlight', message.permalinkChatId);
        }

        //after the room change is complete, focus on the chat input jp 5/11/15
        appEvents.trigger('focus.request.chat');
      break;

      case 'about.to.leave.current.room':
        context.troupe().set('aboutToLeave', true);

      break;

      case 'roomList':
        appEvents.trigger('chat-cache:preload', message.rooms);
        break;
    }
  });

  frameUtils.postMessage({ type: 'context.troupeId', troupeId: context.getTroupeId(), name: context.troupe().get('name') });

  appEvents.on('route', function(hash) {
    frameUtils.postMessage({ type: 'route', hash: hash });
  });

  appEvents.on('permalink.requested', function(type, chat, options) {
    if (context.inOneToOneTroupeContext()) return; // No permalinks to one-to-one chats
    var url = context.troupe().get('url');
    var id = chat.id;

    if (options && options.appendInput) {
      var fullUrl = clientEnv.basePath + url + '?at=' + id;
      var formattedDate = fullTimeFormat(chat.get('sent'));
      appEvents.trigger('input.append', ':point_up: [' + formattedDate + '](' + fullUrl + ')');
    }

    frameUtils.postMessage({ type: 'permalink.requested', url: url, permalinkType: type, id: id });
  });

  appEvents.on('realtime.testConnection', function(reason) {
    frameUtils.postMessage({ type: 'realtime.testConnection', reason: reason });
  });

  appEvents.on('realtime:newConnectionEstablished', function() {
    frameUtils.postMessage({ type: 'realtime.testConnection', reason: 'newConnection' });
  });

  appEvents.on('unreadItemsCount', function(newCount) {
    frameUtils.postMessage({ type: 'unreadItemsCount', count: newCount, troupeId: context.getTroupeId() });
  });

  appEvents.on('clearActivityBadge', function() {
    frameUtils.postMessage({ type: 'clearActivityBadge', troupeId: context.getTroupeId() });
  });

  // Bubble keyboard events
  appEvents.on('keyboard.all', function(name, event, handler) {
    // Don't send back events coming from the app frame
    if (event.origin && event.origin === 'app') return;
    var message = {
      type: 'keyboard',
      name: name,

      // JSON serialisation makes it not possible to send the event object
      // Keep track of the origin in case of return
      event: {origin: event.origin},
      handler: handler,
    };
    frameUtils.postMessage(message);
  });

  // Bubble chat toggle events
  appEvents.on('chat.edit.show', function() {
    frameUtils.postMessage({type: 'chat.edit.show'});
  });

  appEvents.on('chat.edit.hide', function() {
    frameUtils.postMessage({type: 'chat.edit.hide'});
  });

  // Send focus events to app frame
  appEvents.on('focus.request.app.in', function(event) {
    frameUtils.postMessage({type: 'focus', focus: 'in', event: event});
  });

  appEvents.on('focus.request.app.out', function(event) {
    frameUtils.postMessage({type: 'focus', focus: 'out', event: event});
  });

  appEvents.on('ajaxError', function() {
    frameUtils.postMessage({ type: 'ajaxError' });
  });

  var notifyRemoveError = function(message) {
    appEvents.triggerParent('user_notification', {
      title: 'Failed to remove user',
      text: message,
      className: 'notification-error',
    });
  };

  appEvents.on('command.room.remove', function(username) {
    if (!username) return;

    apiClient.room.delete('/users/' + username + '?type=username', '')
      .catch(function(e) {
        notifyRemoveError(e.friendlyMessage || 'Unable to remove user');
      });
  });

  var appView = new ChatToolbarInputLayout({
    model: context.troupe(),
    template: false,
    el: 'body',
    chatCollection: chatCollection,
    groupsCollection: troupeCollections.groups,
    roomCollection: troupeCollections.troupes
  });

  appView.render();

  /* Drag and drop */
  new DropTargetView({ template: false, el: 'body' }).render();

  var router = new Router({
    dialogRegion: appView.dialogRegion,
    routes: [
      notificationRoutes(),
      roomRoutes({
        rosterCollection: itemCollections.roster,
        // TODO: remove these two options:
        // https://github.com/troupe/gitter-webapp/issues/2211
        rooms: troupeCollections.troupes,
        groups: troupeCollections.groups
      }),
    ]
  });


  var showingHelp = false;
  var hideHelp = function() {
    router.navigate('', { trigger: true });
    showingHelp = false;
  };

  // The help can be exited from the modal itself so keep our variable up to date.
  // Instead of this, there should be a way to check if a help modal is open
  // which would be cleaner than this variable maintenance
  appEvents.on('help.close', function() {
    showingHelp = false;
  });

  appEvents.on('keyboard.help.markdown', function(event) {
    if (showingHelp === 'markdown') hideHelp();
    else {
      appEvents.trigger('focus.request.out', event);
      router.navigate('markdown', {trigger: true});
      showingHelp = 'markdown';
    }
  });

  appEvents.on('keyboard.help.keyboard', function(event) {
    if (showingHelp === 'keys') hideHelp();
    else {
      appEvents.trigger('focus.request.out', event);
      router.navigate('keys', {trigger: true});
      showingHelp = 'keys';
    }
  });

  appEvents.on('keyboard.document.escape', function() {
    if (showingHelp) hideHelp();
  });

  // Listen for changes to the room
  liveContext.syncRoom();

  Backbone.history.start();
});
