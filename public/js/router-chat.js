/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
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
  'views/shareSearch/inviteView',
  'views/app/troupeSettingsView',
  'views/app/markdownView',
  'views/app/keyboardView',
  'views/app/addPeopleView',
  'views/app/integrationSettingsModal',
  'components/unread-items-client',
  'components/helpShareIfLonely',

  'views/chat/decorators/webhookDecorator',
  'views/chat/decorators/issueDecorator',
  'views/chat/decorators/commitDecorator',
  'views/chat/decorators/mentionDecorator',
  'views/chat/decorators/embedDecorator',
  'views/chat/decorators/emojiDecorator',
  'views/app/unreadBannerView',
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
    inviteView, TroupeSettingsView, MarkdownView, KeyboardView, AddPeopleViewModal, IntegrationSettingsModal,
    unreadItemsClient, helpShareIfLonely, webhookDecorator, issueDecorator, commitDecorator, mentionDecorator,
    embedDecorator, emojiDecorator, UnreadBannerView, HeaderView) {
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

    var message = JSON.parse(e.data);
    log('Received message ', message);

    var makeEvent = function(message) {
      var origin = 'app';
        if (message.event && message.event.origin) origin = message.event.origin;
        message.event = {
          origin: origin,
        preventDefault: function() {
          log.warn('Could not use preventDefault() because the event comes from the `' + this.origin + '` frame');
        },
        stopPropagation: function() {
          log.warn('Could not use stopPropagation() because the event comes from the `' + this.origin + '` frame');
        },
        stopImmediatePropagation: function() {
          log.warn('Could not use stopImmediatePropagation() because the event comes from the `' + this.origin + '` frame');
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
      event: {},
      handler: handler
    };
    postMessage(message);
  });

  // Bubble chat toggle events
  appEvents.on('chat.edit.show', function() {
    postMessage({type: 'chat.ed  it.show'});
  });
  appEvents.on('chat.edit.hide', function() {
    postMessage({type: 'chat.edit.hide'});
  });

  // Send focus events to app frame
  appEvents.on('focus.request.app.in', function() {
    console.log('chat send focus in request to app');
    postMessage({type: 'focus', focus: 'in'});
  });
  appEvents.on('focus.request.app.out', function() {
    console.log('chat send focus out request to app');
    postMessage({type: 'focus', focus: 'out'});
  });

  var appView = new ChatIntegratedView({ el: 'body' });
  new RightToolbarView({ el: "#toolbar-frame" });

  new HeaderView({ model: context.troupe(), el: '#header' });

  // instantiate user email collection
  // var userEmailCollection = new UserEmailCollection.UserEmailCollection();

  // Setup the ChatView

  var chatCollectionView = new ChatCollectionView({
    el: $('#content-frame'),
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

  itemCollections.chats.once('sync', function() {
    unreadItemsClient.monitorViewForUnreadItems($('#content-frame'));
  });

  // unreadItemsClient.monitorViewForUnreadItems($('#file-list'));

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
      "inv": "inv",
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

    inv: function() {
      appView.dialogRegion.show(new inviteView.Modal({}));
    }

  });

  var router = new Router();

  var showingHelp = false;
  var hideHelp = function() {
    router.navigate('', {trigger: true});
    showingHelp = false;
  };

  appEvents.on('keyboard.help', function(event) {
    if (showingHelp) hideHelp();
    else {
      appEvents.trigger('focus.request.out', event);
      router.navigate('markdown', {trigger: true});
      showingHelp = 'markdown';
    }
  });
  appEvents.on('keyboard.document.escape', function() {
    if (showingHelp) hideHelp();
  });
  appEvents.on('keyboard.tab.next keyboard.tab.prev', function(e) {
    if (!e.origin) e.preventDefault();
    if (showingHelp) {
      showingHelp = showingHelp === 'markdown' ? 'keys' : 'markdown';
      router.navigate(showingHelp, {trigger: true});
    }
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

  helpShareIfLonely();

  Backbone.history.start();
});
