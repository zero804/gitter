'use strict';
require('utils/initial-setup');
require('utils/font-setup');

var Backbone = require('backbone');
var context = require('utils/context');
var clientEnv = require('gitter-client-env');
var liveContext = require('components/live-context');
var appEvents = require('utils/appevents');
var debug = require('debug-proxy')('app:router-chat');
var ChatToolbarInputLayout = require('views/layouts/chat-toolbar-input');
var DropTargetView = require('views/app/dropTargetView');
var onready = require('./utils/onready');
var apiClient = require('components/apiClient');
var perfTiming = require('./components/perf-timing');
var frameUtils = require('./utils/frame-utils');
var itemCollections = require('collections/instances/integrated-items');
var chatCollection = require('collections/instances/chats-cached');
var fullTimeFormat = require('gitter-web-shared/time/full-time-format');

/* Set the timezone cookie */
require('components/timezone-cookie');

require('components/statsc');
require('views/widgets/preload');
require('components/dozy');
require('template/helpers/all');
require('components/eyeballs');
require('components/bug-reporting');
require('components/focus-events');

// Preload widgets
require('components/ping');

onready(function() {

  appEvents.on('navigation', function(url, type, title) {
    if (frameUtils.hasParentFrameSameOrigin()) {
      frameUtils.postMessage({ type: 'navigation', url: url, urlType: type, title: title});
    } else {
      // No pushState here. Open the link directly
      // Remember that (window.parent === window) when there is no parent frame
      window.parent.location.href = url;
    }
 });

  require('components/link-handler').installLinkHandler();

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
    chatCollection: chatCollection
  });

  appView.render();

  /* Drag and drop */
  new DropTargetView({ template: false, el: 'body' }).render();

  var Router = Backbone.Router.extend({
    routes: {
      '': 'hideModal',
      'share': 'share',
      'delete': 'delete',
      'people': 'people',
      'notifications': 'notifications',
      'markdown': 'markdown',
      'keys': 'keys',
      'integrations': 'integrations',
      'add': 'addPeople',
      'settings': 'settings',
      'tags': 'editTags',
      'autojoin': 'autojoin',
      'notification-defaults': 'notificationDefaults',
      'welcome-message': 'showWelcomeMessage'
    },

    autojoin: function() {
      apiClient.post('/v1/rooms', {
          uri: context.troupe().get('uri') || context.troupe().get('url')
        })
        .then(function() {
          //location.reload();
          context.troupe().set('roomMember', true);
        });
    },

    hideModal: function() {
      appView.dialogRegion.destroy();
    },

    people: function() {
      require.ensure(['views/modals/people-modal'], function(require) {
        var PeopleModal = require('views/modals/people-modal');

        appView.dialogRegion.show(new PeopleModal({
          rosterCollection: itemCollections.roster
        }));
      });
    },

    notifications: function() {
      require.ensure(['views/modals/notification-settings-view'], function(require) {
        var NotificationSettingsView = require('views/modals/notification-settings-view');
        appView.dialogRegion.show(new NotificationSettingsView({ model: new Backbone.Model() }));
      });
    },

    markdown: function() {
      require.ensure(['views/modals/markdown-view'], function(require) {
        var MarkdownView = require('views/modals/markdown-view');
        appView.dialogRegion.show(new MarkdownView({}));
      });
    },

    keys: function() {
      require.ensure(['views/modals/keyboard-view'], function(require) {
        var KeyboardView = require('views/modals/keyboard-view');
        appView.dialogRegion.show(new KeyboardView({}));
      });
    },

    addPeople: function() {
      require.ensure(['views/app/addPeopleView', 'views/modals/upgrade-to-pro-view'], function(require) {
        var room = context.troupe();
        var maxFreeMembers = clientEnv.maxFreeOrgRoomMembers;
        var isOverLimit = room.get('security') !== 'PUBLIC' &&
          room.get('githubType').indexOf('ORG') >= 0 &&
          !room.get('premium') &&
          room.get('userCount') >= maxFreeMembers;

        if (isOverLimit) {
          var GetProViewModal = require('views/modals/upgrade-to-pro-view');
          appView.dialogRegion.show(new GetProViewModal({}));
        } else {
          var AddPeopleViewModal = require('views/app/addPeopleView');
          appView.dialogRegion.show(new AddPeopleViewModal({}));
        }
      });

    },

    settings: function() {
      require.ensure(['views/modals/room-settings-view'], function(require) {
        var RoomSettingsModal = require('views/modals/room-settings-view');
        appView.dialogRegion.show(new RoomSettingsModal({ model: context.troupe() }));
      });
    },

    editTags: function() {
      require.ensure(['views/modals/edit-tags-view'], function(require) {
        var EditTagsView = require('views/modals/edit-tags-view');
        appView.dialogRegion.show(new EditTagsView({roomId: context.troupe().get('id')}));
      });
    },

    integrations: function() {
      if (context.isTroupeAdmin()) {
        require.ensure(['views/modals/integration-settings-view'], function(require) {
          var IntegrationSettingsModal = require('views/modals/integration-settings-view');

          appView.dialogRegion.show(new IntegrationSettingsModal({}));
        });
      } else {
        window.location = '#';
      }
    },

    share: function() {
      require.ensure(['views/modals/share-view'], function(require) {
        var shareView = require('views/modals/share-view');

        appView.dialogRegion.show(new shareView.Modal({}));
      });
    },

    delete: function() {
      require.ensure(['views/modals/delete-room-view'], function(require) {
        var DeleteModal = require('views/modals/delete-room-view');

        appView.dialogRegion.show(new DeleteModal({}));
      });
    },

    notificationDefaults: function() {
      require.ensure(['./views/modals/notification-defaults-view'], function(require) {
        var NotificationDefaultsView = require('./views/modals/notification-defaults-view');

        appView.dialogRegion.show(new NotificationDefaultsView({
          model: new Backbone.Model()
        }));

      });
    },

    showWelcomeMessage: function (){
      require.ensure(['./views/modals/welcome-message'], function(require){
        var WelcomeMessageView = require('./views/modals/welcome-message');
        appView.dialogRegion.show(new WelcomeMessageView.Modal());
      });
    },

  });

  var router = new Router();

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
