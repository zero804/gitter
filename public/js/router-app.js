/* eslint complexity: ["error", 19] */
'use strict';
require('utils/initial-setup');
require('utils/font-setup');

var $ = require('jquery');
var appEvents = require('utils/appevents');
var context = require('utils/context');
var clientEnv = require('gitter-client-env');
var Backbone = require('backbone');
var AppLayout = require('views/layouts/app-layout');
var LoadingView = require('views/app/loading-view');
var troupeCollections = require('collections/instances/troupes');
var repoModels = require('collections/repos');
var ReposCollection = repoModels.ReposCollection;
var TitlebarUpdater = require('components/titlebar');
var realtime = require('components/realtime');
var onready = require('./utils/onready');
var urlParser = require('utils/url-parser');
var RAF = require('utils/raf');
var RoomCollectionTracker = require('components/room-collection-tracker');
var SPARoomSwitcher = require('components/spa-room-switcher');
var debug = require('debug-proxy')('app:router-app');
var linkHandler = require('./components/link-handler');
var roomListGenerator = require('./components/chat-cache/room-list-generator');
var moment = require('moment');

require('components/statsc');
require('views/widgets/preload');
require('components/user-notifications');
require('template/helpers/all');
require('components/bug-reporting');
require('components/focus-events');


require('utils/tracking');
require('components/ping');

// Preload widgets
require('views/widgets/avatar');

onready(function() {
  var chatIFrame = document.getElementById('content-frame');
  var titlebarUpdater = new TitlebarUpdater();

  new LoadingView(chatIFrame, document.getElementById('loading-frame'));

  // Send the hash to the child
  if (window.location.hash) {
    var noHashSrc = chatIFrame.src.split('#')[0];
    chatIFrame.src = noHashSrc + window.location.hash;
  }

  /* TODO: add the link handler here? */
  require('components/link-handler').installLinkHandler();

  /*
   * Push State Management
   */

  /* Replace the `null` state on startup with the real state, so that when a client clicks back to the
   * first page of gitter, we know what the original URL was (instead of null)
   */
  window.history.replaceState(chatIFrame.src, '', window.location.href);

  function initChatCache() {
    //if we don't have any troupes in the troupeCollection
    //wait for it to sync before posting the message
    if(!troupeCollections.troupes.length) {
      troupeCollections.troupes.once('sync', function(){
        postMessage({
          type: 'roomList',
          rooms: roomListGenerator(troupeCollections.troupes),
        });
      });
    }
    else {
      postMessage({
        type: 'roomList',
        rooms: roomListGenerator(troupeCollections.troupes),
      });
    }
  }

  function getContentFrameLocation() {
    var contentFrame = document.querySelector('#content-frame');
    return contentFrame.contentWindow.location;
  }

  var roomSwitcher = new SPARoomSwitcher(troupeCollections.troupes, clientEnv.basePath, getContentFrameLocation);
  roomSwitcher.on('replace', function(href) {
    debug('Room switch: replace %s', href);

    context.setTroupeId(undefined); // TODO: update the title....
    /*
     * Use location.replace so as not to affect the history state of the application
     *
     * The history has already been pushed via the pushstate, so we don't want to double up
     */
    RAF(function() {
      getContentFrameLocation().replace(href);
    });
  });

  roomSwitcher.on('reload', function() {
    debug('Room switch: reload');
    context.setTroupeId(undefined); // TODO: update the title....
    RAF(function() {
      getContentFrameLocation().reload(true);
    });
  });

  roomSwitcher.on('switch', function(troupe, permalinkChatId) {
    debug('Room switch: switch to %s', troupe.attributes);

    context.setTroupeId(troupe.id);

    // turn backbone object to plain one so we don't modify the original
    var newTroupe = troupe.toJSON();

    // Set the last access time immediately to prevent
    // delay in hidden rooms becoming visible only
    // once we get the server-side update
    var liveCollectionTroupe = troupeCollections.troupes.get(troupe.id)
    if (liveCollectionTroupe) {
      liveCollectionTroupe.set('lastAccessTime', moment());
    }

    // add the group to the troupe as if it was serialized by the server
    var groupModel = troupeCollections.groups.get(newTroupe.groupId);
    if (groupModel) {
      newTroupe.group = groupModel.toJSON();
    }

    //post a navigation change to the iframe
    postMessage({
      type: 'change:room',
      newTroupe: newTroupe,
      permalinkChatId: permalinkChatId
    });
  });

  function pushState(state, title, url) {
    if (state == window.history.state) {
      // Don't repush the same state...
      return;
    }

    titlebarUpdater.setRoomName(title);
    window.history.pushState(state, title, url);
    appEvents.trigger('track', url);
  }

  /* Deal with the popstate */
  window.onpopstate = function(e) {
    var iframeUrl = e.state;
    if (!iframeUrl) return;

    //generate title
    var urlDetails = urlParser.parse(iframeUrl);
    var pageTitle = urlDetails.pathname.split('/');
    pageTitle.pop();
    pageTitle = pageTitle.join('/');
    pageTitle = pageTitle.substring(1);

    //update title
    titlebarUpdater.setRoomName(pageTitle);

    //switch rooms
    roomSwitcher.change(iframeUrl);
  };

  var allRoomsCollection = troupeCollections.troupes;
  new RoomCollectionTracker(allRoomsCollection);

  var repoCollection = new ReposCollection();

  var appLayout = new AppLayout({
    template: false,
    el: 'body',
    roomCollection: troupeCollections.troupes,
    //TODO ADD THIS TO MOBILE JP 25/1/16
    orgCollection: troupeCollections.orgs,
    repoCollection: repoCollection,
    groupsCollection: troupeCollections.groups
  });
  appLayout.render();

  allRoomsCollection.on('remove', function(model) {
    if (model.id === context.getTroupeId()) {
      //context.troupe().set('roomMember', false);
      var newLocation = '/home';
      var newFrame = '/home/~home';
      var title = 'home';

      pushState(newFrame, title, newLocation);
      roomSwitcher.change(newFrame);
    }
  });

  // Called from the OSX native client for faster page loads
  // when clicking on a chat notification
  window.gitterLoader = function(url) {
    if (url[0] !== '/') {
      url = '/' + url;
    }

    var parsed = urlParser.parse(url);
    linkHandler.routeLink(parsed, { appFrame: true });
  };

  appEvents.on('navigation', function(url, type, title) {
    debug('navigation: %s', url);
    var parsed = urlParser.parse(url);
    var frameUrl = parsed.pathname + '/~' + type + parsed.search;

    if (parsed.pathname === window.location.pathname) {
      pushState(frameUrl, title, url);
      postMessage({
        type: 'permalink.navigate',
        query: urlParser.parseSearch(parsed.search),
      });
      return;
    }

    pushState(frameUrl, title, url);
    roomSwitcher.change(frameUrl);
  });

  function onUnreadItemsCountMessage(message) {
    var count = message.count;
    var troupeId = message.troupeId;
    if (troupeId !== context.getTroupeId()) {
      debug('troupeId mismatch in unreadItemsCount: got', troupeId, 'expected', context.getTroupeId());
    }

    var v = {
      unreadItems: count,
    };

    if (count === 0) {
      // If there are no unread items, there can't be unread mentions
      // either
      v.mentions = 0;
    }

    debug('Received unread count message: troupeId=%s, update=%j ', troupeId, v);
    allRoomsCollection.patch(troupeId, v);
  }

  function onClearActivityBadgeMessage(message) {
    var troupeId = message.troupeId;
    allRoomsCollection.patch(troupeId, { activity: 0 });
  }

  window.addEventListener('message', function(e) {
    if (e.origin !== clientEnv.basePath) {
      debug('Ignoring message from %s', e.origin);
      return;
    }

    var message;
    try {
      message = JSON.parse(e.data);
    } catch (err) {
      /* It seems as through chrome extensions use this event to pass messages too. Ignore them. */
      return;
    }

    debug('Received message %j', message);

    var makeEvent = function(message) {
      var origin = 'chat';
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

      case 'community-create-view:toggle':
        appEvents.trigger('community-create-view:toggle', message.active);
        break;

      //when the chat app requests the room list send it
      case 'request:roomList':
        initChatCache();
        break;

      case 'unreadItemsCount':
        onUnreadItemsCountMessage(message);
        break;

      case 'clearActivityBadge':
        onClearActivityBadgeMessage(message);
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
        message.name = (message.name || '');
        //patch the event key value as this is needed and seems to get lost
        message.event.key = message.name.split('.').pop();
        appEvents.trigger('keyboard.' + message.name, message.event, message.handler);
        appEvents.trigger('keyboard.all', message.name, message.event, message.handler);
      break;

      case 'focus':
        makeEvent(message);
        appEvents.trigger('focus.request.' + message.focus, message.event);
      break;

      case 'childframe:loaded':
        appEvents.trigger('childframe:loaded');
        roomSwitcher.setIFrameLoadingState(false);
      break;

      case 'permalink.requested':
        var url = message.url + '?at=' + message.id;
        var frameUrl = message.url + '/~' + message.permalinkType + '?at=' + message.id;
        var title = message.url.substring(1);
        pushState(frameUrl, title, url);
      break;
    }
  }, false);

  function postMessage(message) {
    chatIFrame.contentWindow.postMessage(JSON.stringify(message), clientEnv.basePath);
  }

  // Call preventDefault() on tab events so that we can manage focus as we want
  appEvents.on('keyboard.tab.next keyboard.tab.prev', function(e) {
    if (!e.origin) e.preventDefault();
  });

  // Send focus events to chat frame
  appEvents.on('focus.request.chat.in', function(event) {
    postMessage({
      type: 'focus',
      focus: 'in',
      event: event,
    });
  });

  appEvents.on('focus.request.chat.out', function(event) {
    postMessage({
      type: 'focus',
      focus: 'out',
      event: event,
    });
  });

  appEvents.on('about.to.leave.current.room', function() {
    postMessage({
      type: 'about.to.leave.current.room'
    });
  });

  appEvents.on('room-menu:pin', function(val) {
    $('.app-layout').toggleClass('pinned', val);
  });

  // Sent keyboard events to chat frame
  appEvents.on('keyboard.all', function(name, event, handler) {
    // Don't send back events coming from the chat frame
    if (event.origin && event.origin === 'chat') return;
    var message = {
      type: 'keyboard',
      name: name,

      // JSON serialisation makes it not possible to send the event object
      // Keep track of the origin in case of return
      event: {
        origin: event.origin,
      },
      handler: handler,
    };
    postMessage(message);
  });

  var Router = Backbone.Router.extend({
    routes: {
      // TODO: get rid of the pipes
      '': 'hideModal',
      'createcustomroom': 'createcustomroom',
      'createcustomroom/:name': 'createcustomroom',
      'createreporoom': 'createreporoom',
      'createroom': 'createroom',
      'confirm/*uri': 'confirmRoom',
      'createcommunity': 'createCommunity'
    },

    hideModal: function() {
      appLayout.dialogRegion.destroy();
    },

    createroom: function() {
      require.ensure(['views/modals/choose-room-view'], function(require) {
        var chooseRoomView = require('views/modals/choose-room-view');
        appLayout.dialogRegion.show(new chooseRoomView.Modal());
      });
    },

    createreporoom: function() {
      require.ensure(['views/modals/create-repo-room'], function(require) {
         var createRepoRoomView = require('views/modals/create-repo-room');
         appLayout.dialogRegion.show(new createRepoRoomView.Modal());
       });
    },

    createcustomroom: function(name) {
      function getSuitableGroupId() {
        var group = appLayout.getRoomMenuModel().getCurrentGroup();
        return group && group.get('id');
      }

      require.ensure(['views/modals/create-room-view'], function(require) {
        var createRoomView = require('views/modals/create-room-view');
        var modal = new createRoomView.Modal({
          initialGroupId: getSuitableGroupId(),
          roomName: name,
        });

        appLayout.dialogRegion.show(modal);
      });
    },

    confirmRoom: function(uri) {
      require.ensure(['views/modals/confirm-repo-room-view'], function(require) {
        var confirmRepoRoomView = require('views/modals/confirm-repo-room-view');
        appLayout.dialogRegion.show(new confirmRepoRoomView.Modal({
          uri: uri,
        }));
      });
    },

    createCommunity: function(/* uri */) {
      appEvents.trigger('community-create-view:toggle', true);
    },
  });

  new Router();
  Backbone.history.start();

  if (context.popEvent('invite_failed')) {
    appEvents.trigger('user_notification', {
      title: 'Unable to join room',
      text: 'Unfortunately we were unable to add you to the requested room. Please ' +
            'check that you have appropriate access and try again.',
      timeout: 12000,
    });
  }

  if (context.popEvent('new_user_signup')) {
    require.ensure('scriptjs', function(require) {
      var $script = require('scriptjs');
      $script('//platform.twitter.com/oct.js', function() {
        var twitterOct = window.twttr && window.twttr.conversion;
        // Will no exist if it's been blocked by ad-blockers
        if (!twitterOct) return;
        twitterOct.trackPid('l4t99');
      });
    });
  }

});
