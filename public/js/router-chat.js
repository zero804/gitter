require([
  'jquery',
  'backbone',
  'utils/context',
  'components/live-context',
  'utils/appevents',
  'log!router-chat',
  'views/people/peopleCollectionView',
  'views/app/chatIntegratedView',
  'views/chat/chatInputView',
  'views/chat/chatCollectionView',
  'collections/instances/integrated-items',
  'views/righttoolbar/rightToolbarView',
  'views/share/share-view',
  'views/app/troupeSettingsView',
  'views/app/markdownView',
  'views/app/keyboardView',
  'views/app/addPeopleView',
  'views/app/integrationSettingsModal',
  'views/app/collaboratorsView',
  'collections/collaborators',

  'components/unread-items-client',
  'components/helpShareIfLonely',

  'views/chat/decorators/webhookDecorator',
  'views/chat/decorators/issueDecorator',
  'views/chat/decorators/commitDecorator',
  'views/chat/decorators/mentionDecorator',
  'views/chat/decorators/embedDecorator',
  'views/chat/decorators/emojiDecorator',
  'views/app/unreadBannerView',
  'views/app/historyLimitView',
  'views/app/headerView',

  'components/statsc',          // No ref
  'views/widgets/preload',      // No ref
  'filtered-collection',        // No ref
  'components/dozy',            // Sleep detection No ref
  'template/helpers/all',       // No ref
  'components/eyeballs',        // No ref
  'components/bug-reporting',   // No ref
  'components/csrf',            // No ref
  'components/ajax-errors',     // No ref
  'components/focus-events'     // No ref

], function($, Backbone, context, liveContext, appEvents, log, peopleCollectionView, ChatIntegratedView, chatInputView,
    ChatCollectionView, itemCollections, RightToolbarView,
    shareView, TroupeSettingsView, MarkdownView, KeyboardView, AddPeopleViewModal, IntegrationSettingsModal, CollaboratorsView, collaboratorsModels,
    unreadItemsClient, helpShareIfLonely, webhookDecorator, issueDecorator, commitDecorator, mentionDecorator,
    embedDecorator, emojiDecorator, UnreadBannerView, HistoryLimitView, HeaderView) {
  "use strict";

  $(document).on("click", "a", function(e) {
    if(this.href) {
      var href = $(this).attr('href');
      if(href.indexOf('#') === 0) {
        e.preventDefault();
        window.location = href;
      }
    }

    return true;
  });

  // When a user clicks an internal link, prevent it from opening in a new window
  $(document).on("click", "a.link", function(e) {
    var basePath = context.env('basePath');
    var href = e.target.getAttribute('href');
    if(!href || href.indexOf(basePath) !== 0) {
      return;
    }

    e.preventDefault();
    window.parent.location.href = href;
  });

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
      var origin = 'app';
      if (message.event && message.event.origin) origin = message.event.origin;
      message.event = {
        origin: origin,
        preventDefault: function() {
          log('Warning: could not use preventDefault() because the event comes from the `' + this.origin + '` frame');
        },
        stopPropagation: function() {
          log('Warning: could not use stopPropagation() because the event comes from the `' + this.origin + '` frame');
        },
        stopImmediatePropagation: function() {
          log('Warning: could not use stopImmediatePropagation() because the event comes from the `' + this.origin + '` frame');
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
      $.ajax({
        url: "/api/v1/rooms/" + context.getTroupeId() + "/users/" + user.id,
        dataType: "json",
        type: "DELETE",
        success: function() {
          itemCollections.users.remove(user);
        },
        error: function(jqXHR) {
          if (jqXHR.status < 500) notifyRemoveError(jqXHR.responseJSON.error);
          else notifyRemoveError('');
        },
      });
    }
    else notifyRemoveError('User '+ username +' was not found in this room.');
  });

  var appView = new ChatIntegratedView({ el: 'body' });
  new RightToolbarView({ el: "#toolbar-frame" });

  new HeaderView({ model: context.troupe(), el: '#header' });

  // instantiate user email collection
  // var userEmailCollection = new UserEmailCollection.UserEmailCollection();

  // Setup the ChatView

  var chatCollectionView = new ChatCollectionView({
    el: '#chat-container',
    collection: itemCollections.chats,
    userCollection: itemCollections.users,
    decorators: [webhookDecorator, issueDecorator, commitDecorator, mentionDecorator, embedDecorator, emojiDecorator]
  }).render();

  var unreadChatsModel = unreadItemsClient.acrossTheFold();

  new UnreadBannerView.Top({
    el: '#unread-banner',
    model: unreadChatsModel,
    chatCollectionView: chatCollectionView
  }).render();

  new UnreadBannerView.Bottom({
    el: '#bottom-unread-banner',
    model: unreadChatsModel,
    chatCollectionView: chatCollectionView
  }).render();

  new HistoryLimitView({
    el: '#limit-banner',
    collection: itemCollections.chats,
    chatCollectionView: chatCollectionView
  }).render();


  itemCollections.chats.once('sync', function() {
    unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));
  });

  itemCollections.users.once('sync', function() {
    if(context().permissions.admin) {
      if (itemCollections.users.length === 1) { //itemCollections.chats.length === 0)
        var collaborators = new collaboratorsModels.CollabCollection();
        collaborators.fetch();
        collaborators.once('sync', function() {
          var collaboratorsView = new CollaboratorsView({ collection: collaborators });
          $('#content-frame').prepend(collaboratorsView.render().el);
        });
      }
    }
  });

  new chatInputView.ChatInputView({
    el: $('#chat-input'),
    collection: itemCollections.chats,
    chatCollectionView: chatCollectionView,
    userCollection: itemCollections.users,
    rollers: chatCollectionView.rollers
  }).render();


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
      appView.dialogRegion.show(new peopleCollectionView.Modal({ collection: itemCollections.sortedUsers }));
    },

    notifications: function() {
      appView.dialogRegion.show(new TroupeSettingsView({}));
    },

    markdown: function() {
      appView.dialogRegion.show(new MarkdownView({}));
    },

    keys: function() {
      appView.dialogRegion.show(new KeyboardView({}));
    },

    addPeople: function() {
      appView.dialogRegion.show(new AddPeopleViewModal({}));
    },

    integrations: function() {
      if(context().permissions.admin) {
        appView.dialogRegion.show(new IntegrationSettingsModal({}));
      } else {
        window.location = '#';
      }
    },

    share: function() {
      appView.dialogRegion.show(new shareView.Modal({}));
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

    $.ajax({
      dataType: "json",
      data: {
        autoConfigureHooks: 1
      },
      type: 'PUT',
      url: '/api/v1/rooms/' + context.getTroupeId(),
      success: function() {
        appEvents.trigger('user_notification', {
          title: 'Thank You',
          text: 'Your integrations have been setup.'
        });
      }
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

  //helpShareIfLonely();

  Backbone.history.start();
});
