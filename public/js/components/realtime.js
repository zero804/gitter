"use strict";

var context = require('utils/context');
var appEvents = require('utils/appevents');
var log = require('utils/log');
var logout = require('utils/logout');
var RealtimeClient = require('gitter-realtime-client').RealtimeClient;

function isMobile() {
  return navigator.userAgent.indexOf('Mobile/') >= 0;
}

var eyeballState = true;

appEvents.on('eyeballStateChange', function (state) {
  log.info('rt: Switching eyeball state to ', state);
  eyeballState = state;
});

function authProvider(callback) {
  context.getAccessToken(function (accessToken) {
    var mobile = isMobile();

    return callback({
      token: accessToken,
      version: context.env('version'),
      troupeId: context.getTroupeId(),
      connType: mobile ? 'mobile' : 'online',
      client: mobile ? 'mobweb' : 'web',
      eyeballs: eyeballState ? 1 : 0
    });

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

          log.info('rt: Application version mismatch');
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
        log.error('rt: Access denied', message);

        window.alert('Realtime communications with the server have been disconnected.');
        logout();
      }
    }

    callback(message);
  }
};

var timer = {
  incoming: function(msg, cb) {
    var t = Date.now();
    if (msg.ext && msg.ext.snapshot) {
      console.debug('snapshot', t-T, msg.subscription, msg.ext.snapshot);
    }
    cb(msg);
  }
};


var BRIDGE_NOTIFICATIONS = {
  user_notification: 1,
  activity: 1
};

var client;

function getOrCreateClient() {
  if (client) return client;

  var c = context.env('websockets');
  client = new RealtimeClient({
    fayeUrl: c.fayeUrl,
    authProvider: authProvider,
    fayeOptions: c.options,
    websocketsDisabled: isMobile(),
    extensions: [
        handshakeExtension,
        accessTokenFailureExtension,
        timer
      ]
  });

  client.on('stats', function (type, statName, value) {
    appEvents.trigger('stats.' + type, statName, value);
  })

  var userSubscription;

  context.user().watch('change:id', function (user) {
    if (userSubscription) {
      userSubscription.cancel();
      userSubscription = null;
    }

    if (user.id) {
      userSubscription = client.subscribe('/v1/user/' + user.id, function (message) {
        if (message.operation === 'patch' && message.model && message.model.id === user.id) {
          // Patch the updates onto the user
          user.set(message.model);
        }

        if (BRIDGE_NOTIFICATIONS[message.notification]) {
          appEvents.trigger(message.notification, message);
        }
      });
    }

  });

  return client;
}

appEvents.on('eyeballsInvalid', function (originalClientId) {
  log.info('rt: Resetting connection after invalid eyeballs');
  reset(originalClientId);
});

appEvents.on('reawaken', function () {
  log.info('rt: Recycling connection after reawaken');
  reset(getClientId());
});

// Cordova events.... doesn't matter if IE8 doesn't handle them
if (document.addEventListener) {
  document.addEventListener("deviceReady", function () {
    document.addEventListener("online", function () {
      log.info('rt: online');
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

  subscribe: function (channel, callback, context, options) {
    return getOrCreateClient().subscribe(channel, callback, context, options);
  },

  testConnection: testConnection,

  reset: reset,

  getClient: function () {
    return getOrCreateClient();
  },

  registerForSnapshots: function (channel, listener, stateProvider) {
    // TODO: refactor callers to handle registerSnapshotHandler
    return getOrCreateClient().registerSnapshotHandler(channel, {
      handleSnapshot: listener,
      getSnapshotState: stateProvider
    });
  }

};
