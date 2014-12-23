"use strict";
var $ = require('jquery');
var Backbone = require('backbone');
var context = require('utils/context');
var liveContext = require('components/live-context');
var appEvents = require('utils/appevents');
var log = require('utils/log');
var isValidRoomUri = require('utils/valid-room-uri');
var ChatIntegratedView = require('views/app/chatIntegratedView');
var itemCollections = require('collections/instances/integrated-items');
var onready = require('./utils/onready');

var apiClient = require('components/apiClient');
var HeaderView = require('views/app/headerView');

require('utils/initial-setup');
require('components/statsc');
require('views/widgets/preload');
require('filtered-collection');
require('components/dozy');
require('template/helpers/all');
require('components/eyeballs');
require('components/bug-reporting');
require('components/focus-events');

// Preload widgets
require('views/widgets/avatar');
require('views/widgets/timeago');


onready(function () {

  postMessage({ type: "chatframe:loaded" });

  $(document).on("click", "a", function (e) {
    var basePath = context.env('basePath');
    var href = e.target.getAttribute('href');
    var path = href.replace(basePath, '');

    if (href.indexOf('#') === 0) {
      e.preventDefault();
      window.location = href;
      return true;
    }

    if (href.indexOf(basePath) === 0 && isValidRoomUri(path)) {
        e.preventDefault();
        appEvents.trigger('navigation', path, 'chat');
    } else {
      return true;
    }
  });

  window.addEventListener('message', function(e) {
    if(e.origin !== context.env('basePath')) {
      log.info('Ignoring message from ' + e.origin);
      return;
    }

    var message;
    try {
      message = JSON.parse(e.data);
    } catch(err) {
      /* It seems as through chrome extensions use this event to pass messages too. Ignore them. */
      return;
    }

    log.info('Received message ', message);

    var makeEvent = function(message) {
      var origin = 'app';
      if (message.event && message.event.origin) origin = message.event.origin;
      message.event = {
        origin: origin,
        preventDefault: function() {
          log.info('Warning: could not use preventDefault() because the event comes from the `' + this.origin + '` frame');
        },
        stopPropagation: function() {
          log.info('Warning: could not use stopPropagation() because the event comes from the `' + this.origin + '` frame');
        },
        stopImmediatePropagation: function() {
          log.info('Warning: could not use stopImmediatePropagation() because the event comes from the `' + this.origin + '` frame');
        }
      };
    };

    switch(message.type) {
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
    parent.postMessage(JSON.stringify(message), context.env('basePath'));
  }

  postMessage({ type: "context.troupeId", troupeId: context.getTroupeId(), name: context.troupe().get('name') });

  appEvents.on('navigation', function(url, type, title) {
    postMessage({ type: "navigation", url: url, urlType: type, title: title});
  });

  appEvents.on('route', function(hash) {
    postMessage({ type: "route", hash: hash });
  });

  appEvents.on('realtime.testConnection', function(reason) {
    postMessage({ type: "realtime.testConnection", reason: reason });
  });

  appEvents.on('realtime:newConnectionEstablished', function() {
    postMessage({ type: "realtime.testConnection", reason: 'newConnection' });
  });

  appEvents.on('unreadItemsCount', function(newCount) {
    postMessage({ type: "unreadItemsCount", count: newCount, troupeId: context.getTroupeId() });
  });

  // Bubble keyboard events
  appEvents.on('keyboard.all', function (name, event, handler) {
    // Don't send back events coming from the app frame
    if (event.origin && event.origin === 'app') return;
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

  // Bubble chat toggle events
  appEvents.on('chat.edit.show', function() {
    postMessage({type: 'chat.edit.show'});
  });
  appEvents.on('chat.edit.hide', function() {
    postMessage({type: 'chat.edit.hide'});
  });

  // Send focus events to app frame
  appEvents.on('focus.request.app.in', function(event) {
    postMessage({type: 'focus', focus: 'in', event: event});
  });
  appEvents.on('focus.request.app.out', function(event) {
    postMessage({type: 'focus', focus: 'out', event: event});
  });

  appEvents.on('ajaxError', function() {
    postMessage({ type: 'ajaxError' });
  });

  var notifyRemoveError = function(message) {
    appEvents.triggerParent('user_notification', {
      title: 'Failed to remove user',
      text: message,
      className: 'notification-error'
    });
  };

  appEvents.on('command.room.remove', function(username) {
    var user = itemCollections.users.findWhere({username: username});
    if (user) {
      apiClient.room.delete("/users/" + user.id, "")
        .then(function() {
          itemCollections.users.remove(user);
        })
        .fail(function(xhr) {
          if (xhr.status < 500) notifyRemoveError(xhr.responseJSON.error);
          else notifyRemoveError('');
      });
    }
    else notifyRemoveError('User '+ username +' was not found in this room.');
  });

  var appView = new ChatIntegratedView({ el: 'body' });
  new HeaderView({ model: context.troupe(), el: '#header' });

  // This may require a better home
  itemCollections.users.once('sync', function() {
    if(context().permissions.admin) {
      if (itemCollections.users.length === 1) { //itemCollections.chats.length === 0)

        require.ensure([
          'views/app/collaboratorsView',
          'collections/collaborators'],
          function(require) {
            var CollaboratorsView = require('views/app/collaboratorsView');
            var collaboratorsModels = require('collections/collaborators');
            var collaborators = new collaboratorsModels.CollabCollection();
            collaborators.fetch();
            collaborators.once('sync', function() {
              var collaboratorsView = new CollaboratorsView({ collection: collaborators });
              $('#content-frame').prepend(collaboratorsView.render().el);
            });
        });

      }
    }
  });

  var Router = Backbone.Router.extend({
    routes: {
      // TODO: get rid of the pipes
      "": "hideModal",
      "share": "share",
      "people": "people",
      "notifications": "notifications",
      "markdown": "markdown",
      "keys" : "keys",
      "integrations": "integrations",
      "add" : "addPeople"
    },

    hideModal: function() {
      appView.dialogRegion.close();
    },

    people: function() {
      require.ensure(['views/people/peopleCollectionView'], function(require) {
        var peopleCollectionView = require('views/people/peopleCollectionView');
        appView.dialogRegion.show(new peopleCollectionView.Modal({ collection: itemCollections.sortedUsers }));
      });
    },

    notifications: function() {
      require.ensure(['views/app/troupeSettingsView'], function(require) {
        var TroupeSettingsView = require('views/app/troupeSettingsView');
        appView.dialogRegion.show(new TroupeSettingsView({}));
      });
    },

    markdown: function() {
      require.ensure(['views/app/markdownView'], function(require) {
        var MarkdownView = require('views/app/markdownView');
        appView.dialogRegion.show(new MarkdownView({}));
      });
    },

    keys: function() {
      require.ensure(['views/app/keyboardView'], function(require) {
        var KeyboardView = require('views/app/keyboardView');
        appView.dialogRegion.show(new KeyboardView({}));
      });
    },

    addPeople: function() {
      require.ensure(['views/app/addPeopleView'], function(require) {
        var AddPeopleViewModal = require('views/app/addPeopleView');
        appView.dialogRegion.show(new AddPeopleViewModal({}));
      });

    },

    integrations: function() {
      if(context().permissions.admin) {
        require.ensure(['views/app/integrationSettingsModal'], function(require) {
          var IntegrationSettingsModal = require('views/app/integrationSettingsModal');

          appView.dialogRegion.show(new IntegrationSettingsModal({}));
        });
      } else {
        window.location = '#';
      }
    },

    share: function() {
      require.ensure(['views/share/share-view'], function(require) {
        var shareView = require('views/share/share-view');

        appView.dialogRegion.show(new shareView.Modal({}));
      });
    }

  });

  var router = new Router();

  var showingHelp = false;
  var hideHelp = function() {
    router.navigate('', {trigger: true});
    showingHelp = false;
  };

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

  function oauthUpgradeCallback(e) {
    if(e.data !== "oauth_upgrade_complete") return;

    window.removeEventListener("message", oauthUpgradeCallback, false);

    apiClient.room.put('', { autoConfigureHooks: 1 })
      .then(function() {
        appEvents.trigger('user_notification', {
          title: 'Thank You',
          text: 'Your integrations have been setup.'
        });
    });
  }

  function promptForHook() {
    appEvents.trigger('user_notification', {
      click: function(e) {
        e.preventDefault();
        window.addEventListener("message", oauthUpgradeCallback, false);
        window.open('/login/upgrade?scopes=public_repo');
      },
      title: 'Authorisation',
      text: 'Your room has been created, but we weren\'t able ' +
            'to integrate with the repository as we need write ' +
            'access to your GitHub repositories. Click here to ' +
            'give Gitter access to do this.',
      timeout: 12000
    });
  }

  if(context.popEvent('hooks_require_additional_public_scope')) {
    setTimeout(promptForHook, 1500);
  }

  Backbone.history.start();
});

