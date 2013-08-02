/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/context',
  'faye',
  'log!realtime'
], function($, context, Faye, log) {
  "use strict";

  Faye.Logging.logLevel = 'debug';
  Faye.logger = log;

  var connected = false;
  var connectionProblemTimeoutHandle;
  var persistentOutage = false;

  var clientId = null;

  function isMobile() {
    return navigator.userAgent.indexOf('Mobile/') >= 0;
  }

  function connectionProblemTimeout() {
    connectionProblemTimeoutHandle = null;

    // If there was a timing issue
    if(connected) {
      if(persistentOutage) {
        persistentOutage = false;
        $(document).trigger('realtime:persistentOutageCleared');
      }

      return;
    }

    if(!persistentOutage) {
      persistentOutage = true;
      $(document).trigger('realtime:persistentOutage');
    }
  }

  var eyeballState = true;
  $(document).on('eyeballStateChange', function(event, state) {
    log('Switching eyeball state to ', state);
    eyeballState = state;
  });


  var ClientAuth = function() {};
  ClientAuth.prototype.outgoing = function(message, callback) {
    if(message.channel == '/meta/handshake') {
      message.ext = message.ext || {};
      if(window.troupeContext) message.ext.token = window.troupeContext.accessToken;
      message.ext.connType = isMobile() ? 'mobile' : 'online';
      message.ext.client = isMobile() ? 'mobweb' : 'web';

    } else if(message.channel == '/meta/subscribe') {
      message.ext = message.ext || {};
      message.ext.eyeballs = eyeballState ? 1 : 0;
    }

    callback(message);
  };

  ClientAuth.prototype.incoming = function(message, callback) {
    if(message.channel == '/meta/handshake') {
      if(message.successful) {
        if(clientId !== message.clientId) {
          clientId = message.clientId;
          log("Realtime reestablished. New id is " + message.clientId);
          $(document).trigger('realtime:newConnectionEstablished');
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
        for(var i = 0; i < listeners.length; i++) { listeners[i](snapshot); };
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

  AccessTokenFailureExtension.prototype.incoming = function(message, callback) {
    if(message.channel == '/meta/handshake' && !message.successful && message.error) {
      var error = message.error.split('::')[0];
      if(error === '403') {
        log('Access denied. Will not retry');
        window.location.reload();
      }
    }

    callback(message);
  };

  function createClient() {
    var c = context().websockets;
    /*
    if you find this, remove?
    if(!c) {
      log('Websockets configuration not found, defaulting');
      c = {
        fayeUrl: '/faye',
        options: {
          interval: 10
        }
      };
    }
    */

    var client = new Faye.Client(c.fayeUrl, c.options);

    if(c.disable) {
      for(var i = 0; i < c.length; i++) {
        client.disable(c.disable[i]);
      }
    }

    client.addExtension(new ClientAuth());
    client.addExtension(snapshotExtension);
    client.addExtension(new AccessTokenFailureExtension());

    client.bind('transport:down', function() {
      log('transport:down');
      connected = false;

      if(!connectionProblemTimeoutHandle) {
        connectionProblemTimeoutHandle = window.setTimeout(connectionProblemTimeout, 5000);
      }

      // the client is not online
      $(document).trigger('realtime:down');
    });

    client.bind('transport:up', function() {
      log('transport:up');
      connected = true;

      if(connectionProblemTimeoutHandle) {
        window.clearTimeout(connectionProblemTimeoutHandle);
        connectionProblemTimeoutHandle = null;
      }

      // the client is online
      $(document).trigger('realtime:up');

      // Long term outage
      if(persistentOutage) {
        persistentOutage = false;
        $(document).trigger('realtime:persistentOutageCleared');
      }
    });

    // TODO: this stuff below really should find a better home
    if(context.getTroupeId()) {
      client.subscribe('/troupes/' + context.getTroupeId(), function(message) {
        log("Troupe Subscription!", message);

        if(message.notification === 'presence') {
          if(message.status === 'in') {
            $(document).trigger('userLoggedIntoTroupe', message);
          } else if(message.status === 'out') {
            $(document).trigger('userLoggedOutOfTroupe', message);
          }
        }

      });
    }


    client.connect(function() {});


    return client;
  }


  // Give the initial load 5 seconds to connect before warning the user that there is a problem
  connectionProblemTimeoutHandle = window.setTimeout(connectionProblemTimeout, 5000);

  var client;
  function getOrCreateClient() {
    if(client) return client;
    client = createClient();
    return client;
  }

  $(document).on('reawaken', function() {
    log('Recycling connection after reawaken');

    testConnection();
  });

  // Cordova events.... doesn't matter if IE8 doesn't handle them
  if(document.addEventListener) {
    document.addEventListener("deviceReady", function() {
      document.addEventListener("online", function() {
        log('realtime: online');
        testConnection();
      }, false);
    }, false);
  }

  function testConnection() {
    /* Only test the connection if one has already been established */
    if(!client) return;

    client.publish('/ping', { });
  }


  return {
    getClientId: function() {
      return clientId;
    },

    subscribe: function(channel, callback, context) {
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