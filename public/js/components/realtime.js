/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'underscore',
  'utils/context',
  'faye',
  'utils/appevents',
  'log!realtime'
], function($, _, context, Faye, appEvents, log) {
  "use strict";

  var logLevel = parseInt(window.localStorage.fayeLogging, 10) || 0;

  Faye.logger = {};
  var logLevels = ['fatal', 'error', 'warn', 'info', 'debug'];
  logLevels.slice(0, 1 + logLevel).forEach(function(level) {
    Faye.logger[level] = function(msg) { log('faye: ' + level + ': ' + msg); };
  });

  var clientId = null;

  function isMobile() {
    return navigator.userAgent.indexOf('Mobile/') >= 0;
  }

  var eyeballState = true;

  appEvents.on('eyeballStateChange', function(state) {
    log('Switching eyeball state to ', state);
    eyeballState = state;
  });

  var Rate = function() {
    this.hash = {};
    this.counter = 0;
  };

  Rate.prototype.event = function() {
    this.counter++;

    var d = Math.floor(Date.now() / 10000);
    if(this.hash[d]) {
      this.hash[d]++;
    } else {
      this.hash[d] = 1;
    }

    if(this.counter % 10 === 0) {
      this.cleanup(d);
    }

    return this.hash[d - 1] || 0;
  };

  Rate.prototype.cleanup = function(p) {
    var horizon = p - 2;
    var hash = this.hash;

    Object.keys(hash).forEach(function(key) {
      if(parseInt(key, 10) < horizon) {
        delete hash[key];
      }
    });
  };

  var RateMonitor = function() {
    this.hRate = new Rate();
    this.cRate = new Rate();
  };

  RateMonitor.prototype.outgoing = function(message, callback) {
    var counter;
    if(message.channel == '/meta/handshake') {
      counter = this.hRate;
    } else if(message.channel == '/meta/connect') {
      counter = this.cRate;
    }

    if(counter) {
      var rate = counter.event();
      if(rate) {
        /* Don't bother if the value is zero */
        if(!message.ext) message.ext = {};
        message.ext.rate = rate;
        log('Rate of ' + message.channel  + ' is ' + rate + ' per 10s');
      }
    }

    callback(message);
  };

  var ErrorLogger = function() {};
  ErrorLogger.prototype.incoming = function(message, callback) {
    if(message.error) {
      log('Bayeux error', message);
    }

    callback(message);
  };

  var subscribeOptions = {};

  var ClientAuth = function() {};
  ClientAuth.prototype.outgoing = function(message, callback) {
    if(message.channel == '/meta/handshake') {
      if(!message.ext) { message.ext = {}; }
      var ext = message.ext;
      var accessToken = context().accessToken;
      var mobile = isMobile();

      ext.token     = accessToken;
      ext.troupeId  = context.getTroupeId();
      ext.connType  = mobile ? 'mobile' : 'online';
      ext.client    = mobile ? 'mobweb' : 'web';
      ext.eyeballs  = eyeballState ? 1 : 0;

    } else if(message.channel == '/meta/subscribe') {
      if(!message.ext) { message.ext = {}; }

      var options = subscribeOptions[message.subscription];
      if(options) {
        message.ext = _.extend(message.ext, options);
        delete subscribeOptions[message.channel];
      }

      message.ext.eyeballs = eyeballState ? 1 : 0;
    }

    callback(message);
  };

  ClientAuth.prototype.incoming = function(message, callback) {
    if(message.channel == '/meta/handshake') {
      if(message.successful) {
        var ext = message.ext;
        if(ext) {
          if(ext.appVersion && ext.appVersion !== context.env('appVersion')) {
            log('Application version mismatch');
            $(document).trigger('app.version.mismatch');
          }

          if(ext.context) {
            var c = ext.context;
            if(c.troupe) context.setTroupe(c.troupe);
            if(c.user) context.setUser(c.user);
          }
        }
        if(clientId !== message.clientId) {
          clientId = message.clientId;
          log("Realtime reestablished. New id is " + message.clientId);
          appEvents.trigger('realtime:newConnectionEstablished');
        }
      }
    }

    callback(message);
  };

  var SnapshotExtension = function() {
    this._listeners = {};
  };

  SnapshotExtension.prototype.incoming = function(message, callback) {
    if(message.channel == '/meta/subscribe' && message.ext && message.ext.snapshot) {
      var listeners = this._listeners[message.subscription];
      var snapshot = message.ext.snapshot;

      if(listeners) {
        for(var i = 0; i < listeners.length; i++) { listeners[i](snapshot); }
      }
    }

    callback(message);
  };

  SnapshotExtension.prototype.registerForSnapshots = function(channel, listener) {
    var list = this._listeners[channel];
    if(list) {
      list.push(listener);
    } else {
      list = [listener];
      this._listeners[channel] = list;
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
        log('Access denied', message);
        window.setTimeout(function() {
          terminating = false;
          window.alert('Realtime communications with the server have been disconnected. Click OK to reload.');
          if(context.isLoggedIn()) {
            window.parent.location.href = "/" + context.user().get('username');
          } else {
            window.parent.location.href = "/";
          }
        }, 10000);

      }
    }

    callback(message);
  };

  function createClient() {
    var c = context.env('websockets');
    var client = new Faye.Client(c.fayeUrl, c.options);

    // Disable websocket on Mobile due to iOS crash bug
    var userAgent = window.navigator.userAgent;
    if(userAgent.indexOf('Mobile') >= 0) {
      /* Testing no websockets */
      client.disable('websocket');
    }

    client.addExtension(new RateMonitor());
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
        userSubscription = client.subscribe('/api/v1/user/' + user.id, function(message) {
          if (message.notification === 'user_notification' || message.notification === 'activity') {
            appEvents.trigger(message.notification, message);
          }
        });
      }

    });

    return client;
  }

  var client;
  function getOrCreateClient() {
    if(client) return client;
    client = createClient();

    client.on('transport:down', function() {
      log('realtime: transport down');
    });

    client.on('transport:up', function() {
      log('realtime: transport up');
    });

    return client;
  }

  appEvents.on('reawaken', function() {
    log('Recycling connection after reawaken');
    testConnection('reawaken');
  });

  // Cordova events.... doesn't matter if IE8 doesn't handle them
  if(document.addEventListener) {
    document.addEventListener("deviceReady", function() {
      document.addEventListener("online", function() {
        log('realtime: online');
        testConnection('device_ready');
      }, false);
    }, false);
  }

  var pingResponseOutstanding = false;

  function testConnection(reason) {
    /* Only test the connection if one has already been established */
    if(!client) return;
    if(pingResponseOutstanding) return;

    appEvents.trigger('realtime.testConnection', reason);

    log('Testing connection');

    pingResponseOutstanding = true;

    /* Only hold back pings for 30s, then retry is neccessary */
    setTimeout(function() {
      if(pingResponseOutstanding) {
        appEvents.trigger('stats.event', 'faye.ping.reset');

        log('Ping response still outstanding, resetting.');
        pingResponseOutstanding = false;
      }
    }, 30000);

    client.publish('/api/v1/ping2', { reason: reason })
      .then(function() {
        pingResponseOutstanding = false;
        log('Server ping succeeded');
      }, function(error) {
        appEvents.trigger('stats.event', 'faye.ping.reset');

        pingResponseOutstanding = false;
        log('Unable to ping server', error);
        // We could reinstate the persistant outage concept on this
      });
  }

  return {
    getClientId: function() {
      return clientId;
    },

    subscribe: function(channel, callback, context, options) {
      if(options && options.snapshot === false) {
        subscribeOptions[channel] = { snapshot: false };
      }

      return getOrCreateClient().subscribe(channel, callback, context);
    },

    /**
     * Gets Faye to do something that will invoke the connection
     * Useful when we think the connection may be down, but Faye
     * may not have realised it yet.
     */
    testConnection: testConnection,

    getClient: function() {
      return getOrCreateClient();
    },

    registerForSnapsnots: function(channel, listener) {
      return snapshotExtension.registerForSnapshots(channel, listener);
    }

  };
});