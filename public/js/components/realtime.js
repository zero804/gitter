/*jshint unused:true, browser:true*/
define([
  'jquery',
  './fayeWrapper',
  'log!realtime',
  '../utils/momentWrapper'
], function($, FayeWrapper, log, moment) {
  "use strict";

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

  var SubscriptionTimestamp = function() {
    this._timestamps = {};
  };

  SubscriptionTimestamp.prototype.incoming = function(message, callback) {
    if(message.channel == '/meta/subscribe' && message.timestamp) {
      this._timestamps[message.subscription] = moment(message.timestamp).toDate();
    }

    callback(message);
  };

  SubscriptionTimestamp.prototype._getTimestamp = function(channel) {
    return this._timestamps[channel];
  };

  var subscriptionTimestampExtension = new SubscriptionTimestamp();

  function createClient() {
    var c;
    if(window.troupeContext) c = window.troupeContext.websockets;
    if(!c) {
      log('Websockets configuration not found, defaulting');
      c = {
        fayeUrl: '/faye',
        options: {}
      };
    }

    var client = new FayeWrapper(c.fayeUrl, c.options);

    if(c.disable) {
      for(var i = 0; i < c.length; i++) {
        client.disable(c.disable[i]);
      }
    }

    client.addExtension(new ClientAuth());
    client.addExtension(subscriptionTimestampExtension);

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
    if(window.troupeContext && window.troupeContext.troupe) {
      client.subscribe('/troupes/' + window.troupeContext.troupe.id, function(message) {
        log("Troupe Subscription!", message);

        if(message.notification === 'presence') {
          if(message.status === 'in') {
            $(document).trigger('userLoggedIntoTroupe', message);
          } else if(message.status === 'out') {
            $(document).trigger('userLoggedOutOfTroupe', message);
          }
        }

        if (message.operation === "update") {
          $(document).trigger('troupeUpdate', message);
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
    if(client) client.recycle();
  });

  // Cordova events.... doesn't matter if IE8 doesn't handle them
  if(document.addEventListener) {
    document.addEventListener("deviceReady", function() {
      document.addEventListener("online", function() {
        log('realtime: online');
        if(client) client.ping();
      }, false);
    }, false);
  }



  return {
    getClientId: function() {
      var client = getOrCreateClient();
      return client.getClientId();
    },

    recycleConnection: function() {
      log('Recycling connection');
      getOrCreateClient().recycle();

    },

    subscribe: function(channel, callback, context) {
      return getOrCreateClient().subscribe(channel, callback, context);
    },

    getClient: function() {
      return getOrCreateClient();
    },

    getSubscriptionTimestamp: function(channel) {
      return subscriptionTimestampExtension._getTimestamp(channel);
    }
  };
});