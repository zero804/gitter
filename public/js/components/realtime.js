/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/context',
  'faye',
  'utils/appevents',
  'log!realtime'
], function($, context, Faye, appEvents, log) {
  "use strict";

  //Faye.Logging.logLevel = 'debug';
  //Faye.logger = log;

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

  appEvents.on('eyeballStateChange', function(state) {
    log('Switching eyeball state to ', state);
    eyeballState = state;
  });


  var ClientAuth = function() {};
  ClientAuth.prototype.outgoing = function(message, callback) {
    if(message.channel == '/meta/handshake') {
      if(!message.ext) { message.ext = {}; }
      var ext = message.ext;
      var accessToken = context.env('accessToken') || context().accessToken; // THIS SECOND METHOD WILL BE DEPRECATED!

      var mobile =    isMobile();

      ext.token     = accessToken;
      ext.troupeId  = context.getTroupeId();
      ext.connType  = mobile ? 'mobile' : 'online';
      ext.client    = mobile ? 'mobweb' : 'web';
      ext.eyeballs  = eyeballState ? 1 : 0;

    } else if(message.channel == '/meta/subscribe') {
      if(!message.ext) { message.ext = {}; }
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
          $(document).trigger('realtime:newConnectionEstablished');
        }
      }
    } else if(message.channel == '/meta/subscribe') {
      if(message.error && message.error.indexOf('403::') === 0) {
        // More needs to be done here!
        log('Access denied', message);
        //window.alert('Realtime communications with the server have been disconnected. Click OK to reload.');
        window.location.href = "/";
        //window.location = '/home';
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

  AccessTokenFailureExtension.prototype.incoming = function(message, callback) {
    if(message.channel == '/meta/handshake' && !message.successful && message.error) {
      var error = message.error.split('::')[0];
      if(error === '403') {
        log('Access denied. Will not retry');
        //window.location.reload();
        window.location.href = "/";
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
      client.disable('websocket');
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


    var userSubscription;

    context.user().watch('change:id', function(user) {
      if(userSubscription) {
        userSubscription.cancel();
        userSubscription = null;
      }

      if(user.id) {
        userSubscription = client.subscribe('/api/v1/user/' + user.id, function(message) {
          if (message.notification === 'user_notification') {
            appEvents.trigger('user_notification', message);
          }
        });
      }

    });

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

    client.publish('/api/v1/ping', { });
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