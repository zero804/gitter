"use strict";
var $ = require('jquery');
var _ = require('underscore');
var context = require('utils/context');
var Faye = require('faye');
var appEvents = require('utils/appevents');
var log = require('utils/log');

module.exports = (function() {


  /* @const */
  var FAYE_PREFIX = '/api';

  // var logLevel = parseInt(window.localStorage.fayeLogging, 10) || 0;

  Faye.logger = {};
  var logLevels = ['fatal', 'error', 'warn', 'info', 'debug'];
  logLevels.forEach(function(level) {
    var llevel = level == 'fatal' ? 'error' : level;
    Faye.logger[level] = function(msg) { log[llevel]('faye: ' + msg.substring(0, 100)); };
  });

  var clientId = null;

  function isMobile() {
    return navigator.userAgent.indexOf('Mobile/') >= 0;
  }

  var eyeballState = true;

  appEvents.on('eyeballStateChange', function(state) {
    log.info('Switching eyeball state to ', state);
    eyeballState = state;
  });

  var ErrorLogger = function() {};
  ErrorLogger.prototype.incoming = function(message, callback) {
    if(message.error) {
      log.info('Bayeux error', message);
    }

    callback(message);
  };

  var ClientAuth = function() {};
  ClientAuth.prototype.outgoing = function(message, callback) {
    if(message.channel !== '/meta/handshake') return callback(message);

    clientId = null;
    log.info("Rehandshaking realtime connection");

    context.getAccessToken(function(accessToken) {
      if(!message.ext) message.ext = {};
        var ext = message.ext;
        var mobile = isMobile();

        ext.token      = accessToken;
        ext.version    = context.env('version');
        ext.troupeId   = context.getTroupeId();
        ext.connType   = mobile ? 'mobile' : 'online';
        ext.client     = mobile ? 'mobweb' : 'web';
        ext.eyeballs   = eyeballState ? 1 : 0;

        callback(message);
     });
  };

  var updateTimers;

  ClientAuth.prototype.incoming = function(message, callback) {
    if(message.channel !== '/meta/handshake') return callback(message);

    if(message.successful) {
      var ext = message.ext;
      if(ext) {
        if(ext.appVersion && ext.appVersion !== context.env('version')) {

          log.info('Application version mismatch');
          if(!updateTimers) {
            // Give the servers time to complete the upgrade
            updateTimers = [setTimeout(function() {
              /* 10 minutes */
              $(document).trigger('app.version.mismatch');
              appEvents.trigger('stats.event', 'reload.warning.10m');
            }, 10 * 60000), setTimeout(function() {
              /* 1 hour */
              $(document).trigger('app.version.mismatch');
              appEvents.trigger('stats.event', 'reload.warning.1hr');
            }, 60 * 60000), setTimeout(function() {
              /* 6 hours */
              appEvents.trigger('stats.event', 'reload.forced');
              setTimeout(function() {
                window.location.reload(true);
              }, 30000); // Give the stat time to send

            }, 360 * 60000)];
          }

        } else if(updateTimers) {
          updateTimers.forEach(function(t) {
            clearTimeout(t);
          });
          updateTimers = null;
        }

        if(ext.context) {
          var c = ext.context;
          if(c.troupe) context.setTroupe(c.troupe);
          if(c.user) context.setUser(c.user);
        }
      }

      // New clientId?
      if(clientId !== message.clientId) {
        clientId = message.clientId;
        log.info("Realtime reestablished. New id is " + clientId);
        appEvents.trigger('realtime:newConnectionEstablished');
      }

      // Clear any transport problem indicators
      transportUp();
    }

    callback(message);
  };

  var SnapshotExtension = function() {
    this._listeners = {};
    this._stateProvider = {};
  };

  var subscribeOptions = {};
  var subscribeTimers = {};
  SnapshotExtension.prototype.outgoing = function(message, callback) {
    if(message.channel == '/meta/subscribe') {
      subscribeTimers[message.subscription] = Date.now();           // Record start time

      if(!message.ext) { message.ext = {}; }

      message.ext.eyeballs = eyeballState ? 1 : 0;

      var stateProvider = this._stateProvider[message.subscription];
      if(stateProvider) {
        var snapshotState = stateProvider();
        if(snapshotState) {
          if(!message.ext) message.ext = {};
          message.ext.snapshot = snapshotState;
        }
      }

      // These are temporary options to overlay
      var options = subscribeOptions[message.subscription];
      if(options) {
        message.ext = _.extend(message.ext, options);
        delete subscribeOptions[message.channel];
      }


    }

    callback(message);
  };

  SnapshotExtension.prototype.incoming = function(message, callback) {
    if(message.channel == '/meta/subscribe' && message.ext && message.ext.snapshot) {

      // Add some statistics into the mix
      var startTime = subscribeTimers[message.subscription];
      if(startTime) {
        delete subscribeTimers[message.subscription];
        var totalTime = Date.now() - startTime;

        if(totalTime > 400) {
          var lastPart = message.subscription.split(/\//).pop();
          appEvents.trigger('stats.time', 'faye.subscribe.time.' + lastPart, totalTime);

          log.info('Subscription to ' + message.subscription + ' took ' + totalTime + 'ms');
        }
      }

      var listeners = this._listeners[message.subscription];
      var snapshot = message.ext.snapshot;

      if(listeners) {
        for(var i = 0; i < listeners.length; i++) { listeners[i](snapshot); }
      }
    }

    callback(message);
  };

  SnapshotExtension.prototype.registerForSnapshots = function(channel, listener, stateProvider) {
    channel = FAYE_PREFIX + channel;

    var list = this._listeners[channel];
    if(list) {
      list.push(listener);
    } else {
      list = [listener];
      this._listeners[channel] = list;
    }

    if(stateProvider) {
      if(this._stateProvider[channel]) {
        log.info('Warning: a stateprovider already exists for ' + channel);
      }

      this._stateProvider[channel] = stateProvider;
    }
  };

  var snapshotExtension = new SnapshotExtension();

  var AccessTokenFailureExtension = function() {
  };

  var terminating = false;

  AccessTokenFailureExtension.prototype.incoming = function(message, callback) {
    if(message.error && message.advice && message.advice.reconnect === 'none') {
      // advice.reconnect == 'none': the server has effectively told us to go away for good
      if(!terminating) {
        terminating = true;
        // More needs to be done here!
        log.info('Access denied', message);

        window.alert('Realtime communications with the server have been disconnected.');
        if(context.isLoggedIn()) {
          window.parent.location.href = "/signout";
        } else {
          window.parent.location.href = "/";
        }

      }
    }

    callback(message);
  };

  var BRIDGE_NOTIFICATIONS = {
    user_notification: 1,
    activity: 1
  };

  function createClient() {
    var c = context.env('websockets');
    c.options.reuseTransport = false; // TODO: consider if we need this
    var client = new Faye.Client(c.fayeUrl, c.options);

    if(websocketsDisabled) {
      /* Testing no websockets */
      client.disable('websocket');
    }

    client.addExtension(new ClientAuth());
    client.addExtension(snapshotExtension);
    client.addExtension(new AccessTokenFailureExtension());
    client.addExtension(new ErrorLogger());

    var userSubscription;

    context.user().watch('change:id', function(user) {
      if(userSubscription) {
        userSubscription.cancel();
        userSubscription = null;
      }

      if(user.id) {
        userSubscription = client.subscribe(FAYE_PREFIX + '/v1/user/' + user.id, function(message) {
          if(message.operation === 'patch' && message.model && message.model.id === user.id) {
            // Patch the updates onto the user
            user.set(message.model);
          }

          if(BRIDGE_NOTIFICATIONS[message.notification]) {
            appEvents.trigger(message.notification, message);
          }
        });
      }

    });

    return client;
  }

  var client;
  var connectionFailureTimeout;
  var persistentOutage;
  var websocketsDisabled = isMobile();
  var persistentOutageStartTime;

  function transportDown(persistentOutageTimeout, initialConnection) {
    var c = context.env('websockets');
    var timeout = persistentOutageTimeout || c.options && c.options.timeout * 1.2 || 60;

    if(!connectionFailureTimeout) {
      connectionFailureTimeout = setTimeout(function() {
        if(!persistentOutage) {
          persistentOutageStartTime = Date.now();
          persistentOutage = true;
          log.info('realtime: persistent outage');
          appEvents.trigger('connectionFailure');

          // Don't disable websockets on the initial connection
          if(!initialConnection && !websocketsDisabled) {
            log.info('realtime: disabling websockets');
            client.disable('websockets');
          }
        }
      }, timeout * 1000);
    }
  }

  function transportUp() {
    if(connectionFailureTimeout) {
      clearTimeout(connectionFailureTimeout);
      connectionFailureTimeout = null;
    }

    if(persistentOutage) {
      appEvents.trigger('stats.event', 'faye.outage.restored');
      appEvents.trigger('stats.time', 'faye.outage.restored.time', Date.now() - persistentOutageStartTime);
      persistentOutage = false;
      persistentOutageStartTime = null;
      log.info('realtime: persistent outage restored');
      appEvents.trigger('connectionRestored');
    }
  }

  function getOrCreateClient() {
    if(client) return client;
    client = createClient();

    // Initially, the transport is down
    transportDown(10 /* seconds */, true /* initial connection */);

    client.on('transport:down', function() {
      log.info('realtime: transport down');
      transportDown();
    });

    client.on('transport:up', function() {
      log.info('realtime: transport up');
      transportUp();
    });

    return client;
  }

  appEvents.on('eyeballsInvalid', function(originalClientId) {
    log.info('Resetting connection after invalid eyeballs');
    reset(originalClientId);
  });

  appEvents.on('reawaken', function() {
    log.info('Recycling connection after reawaken');
    reset(clientId);
  });

  // Cordova events.... doesn't matter if IE8 doesn't handle them
  if(document.addEventListener) {
    document.addEventListener("deviceReady", function() {
      document.addEventListener("online", function() {
        log.info('realtime: online');
        testConnection('device_ready');
      }, false);
    }, false);
  }

  var pingResponseOutstanding = false;

  function testConnection(reason) {
    /* Only test the connection if one has already been established */
    if(!client) return;

    /* Wait until the connection is established before attempting the test */
    if(!clientId) return;

    if(pingResponseOutstanding) return;

    if(reason !== 'ping') {
      appEvents.trigger('realtime.testConnection', reason);
      log.info('Testing connection due to ' + reason);
    }

    pingResponseOutstanding = true;
    var originalClientId = clientId;
    /* Only hold back pings for 30s, then retry is neccessary */
    setTimeout(function() {
      if(pingResponseOutstanding) {
        appEvents.trigger('stats.event', 'faye.ping.reset');

        pingResponseOutstanding = false;

        reset(originalClientId);
      }
    }, 30000);

    client.publish(FAYE_PREFIX + '/v1/ping2', { reason: reason })
      .then(function() {

        pingResponseOutstanding = false;
        log.info('Server ping succeeded');
      }, function(error) {
        log.info('Server ping failed: ', error);
        appEvents.trigger('stats.event', 'faye.ping.reset');

        pingResponseOutstanding = false;
        reset(originalClientId);
      });
  }

  function reset(clientIdOnPing) {
    if(!client) return;
    if(clientIdOnPing === clientId) {
      log.info("Client reset requested");
      clientId = null;
      client.reset();
    } else {
      log.info("Ignoring reset request as clientId has changed.");
    }
  }

  return {
    getClientId: function() {
      return clientId;
    },

    subscribe: function(channel, callback, context, options) {
      channel = FAYE_PREFIX + channel;
      log.info('Subscribing to ' + channel);

      // Temporary options to pass onto the subscription message
      subscribeOptions[channel] = options;

      return getOrCreateClient().subscribe(channel, callback, context);
    },

    /**
     * Gets Faye to do something that will invoke the connection
     * Useful when we think the connection may be down, but Faye
     * may not have realised it yet.
     */
    testConnection: testConnection,

    reset: reset,

    getClient: function() {
      return getOrCreateClient();
    },

    registerForSnapshots: function(channel, listener, stateProvider) {
      return snapshotExtension.registerForSnapshots(channel, listener, stateProvider);
    }

  };

})();

