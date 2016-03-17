"use strict";

var context = require('utils/context');
var appEvents = require('utils/appevents');
var log = require('utils/log');
var logout = require('utils/logout');
var RealtimeClient = require('gitter-realtime-client').RealtimeClient;
var debug = require('debug-proxy')('app:realtime');
var realtimePresenceTracker = require('./realtime-presence-tracking');
var _ = require('underscore');

var PING_INTERVAL = 30000;
var ENABLE_APP_LAYER_PINGS = true;

// The reason we use this instead of the `utils/is-mobile` module is that
// this is called before contentready and `utils/is-mobile` needs
// contentready before it works
function isMobile() {
  return navigator.userAgent.toLowerCase().indexOf('mobile') >= 0;
}

function authProvider(callback) {
  context.getAccessToken()
    .then(function(accessToken) {
      var mobile = isMobile();
      var presenceDetails = realtimePresenceTracker.getAuthDetails();
      var authMessage = _.extend({
        token: accessToken,
        version: context.env('version'),
        connType: mobile ? 'mobile' : 'online',
        client: mobile ? 'mobweb' : 'web',
      }, presenceDetails);
      return callback(authMessage);

    });
}

var updateTimers;
var handshakeExtension = {
  incoming: function (message, callback) {
    if (message.channel !== '/meta/handshake') return callback(message);

    if (message.successful) {
      var ext = message.ext;
      if (ext) {
        if (ext.appVersion && ext.appVersion !== context.env('version')) {

          debug('Application version mismatch');
          if (!updateTimers) {
            // Give the servers time to complete the upgrade
            updateTimers = [setTimeout(function () {
              /* 10 minutes */
              appEvents.trigger('app.version.mismatch');
              appEvents.trigger('stats.event', 'reload.warning.10m');
            }, 10 * 60000), setTimeout(function () {
              /* 1 hour */
              appEvents.trigger('app.version.mismatch');
              appEvents.trigger('stats.event', 'reload.warning.1hr');
            }, 60 * 60000), setTimeout(function () {
              /* 6 hours */
              appEvents.trigger('stats.event', 'reload.forced');
              setTimeout(function () {
                window.location.reload(true);
              }, 30000); // Give the stat time to send

            }, 360 * 60000)];
          }

        } else if (updateTimers) {
          updateTimers.forEach(function (t) {
            clearTimeout(t);
          });
          updateTimers = null;
        }

        if (ext.context) {
          var c = ext.context;
          if (c.troupe) context.setTroupe(c.troupe);
          if (c.user) context.setUser(c.user);
        }
      }
    }

    callback(message);
  }
};


var terminating = false;

var accessTokenFailureExtension = {
  incoming: function (message, callback) {
    if (message.error && message.advice && message.advice.reconnect === 'none') {
      // advice.reconnect == 'none': the server has effectively told us to go away for good
      if (!terminating) {
        terminating = true;
        // More needs to be done here!
        log.error('Access denied', message);

        window.alert('Realtime communications with the server have been disconnected.');
        logout();
      }
    }

    callback(message);
  }
};

var client;
var pingTimer;

function getOrCreateClient() {
  if (client) return client;

  var c = context.env('websockets');
  client = new RealtimeClient({
    fayeUrl: c.fayeUrl,
    authProvider: authProvider,
    fayeOptions: c.options,
    extensions: [
      handshakeExtension,
      accessTokenFailureExtension
    ],
    websocketsDisabled: context.hasFeature('disable-websockets')
  });

  client.on('stats', function (type, statName, value) {
    appEvents.trigger('stats.' + type, statName, value);
  });

  client.on('connection:up', function() {
    appEvents.trigger('realtime-connectivity:up');
  });

  client.on('connection:down', function() {
    appEvents.trigger('realtime-connectivity:down');
  });

  if (ENABLE_APP_LAYER_PINGS) {
    pingTimer = setInterval(function() {
      debug('Performing ping');
      client.testConnection('ping');
    }, PING_INTERVAL);
  }

  // Subscribe to the user object for changes to the user
  client.subscribeTemplate({
    urlTemplate: '/v1/user/:userId',
    contextModel: context.contextModel(),
    onMessage: function(message) {
      var user = context.user();

      if (message.operation === 'patch' && message.model && message.model.id === user.id) {
        // Patch the updates onto the user
        user.set(message.model);
      }

      switch(message.notification) {
        case 'user_notification':
          appEvents.trigger('user_notification', _.extend(message, { notificationKey: message.chatId }));
          break;
        case 'activity':
          appEvents.trigger('activity', message);
          break;
      }
    }
  });

  return client;
}

appEvents.on('eyeballsInvalid', function (originalClientId) {
  debug('Resetting connection after invalid eyeballs');
  reset(originalClientId);
});

appEvents.on('reawaken', function () {
  debug('Recycling connection after reawaken');
  reset(getClientId());
});

// Cordova events.... doesn't matter if IE8 doesn't handle them
if (document.addEventListener) {
  document.addEventListener("deviceReady", function () {
    document.addEventListener("online", function () {
      debug('online');
      testConnection('device_ready');
    }, false);
  }, false);
}

function getClientId() {
  return client && client.getClientId();
}

function reset(clientId) {
  getOrCreateClient().reset(clientId);
}

function testConnection(reason) {
  getOrCreateClient().testConnection(reason);
}

module.exports = {
  getClientId: getClientId,

  subscribe: function (channel, callback, context) {
    return getOrCreateClient().subscribe(channel, callback, context);
  },

  testConnection: testConnection,

  reset: reset,

  getClient: function () {
    return getOrCreateClient();
  }

};

window._realtime = module.exports;
