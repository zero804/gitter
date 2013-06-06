/*jshint unused:true, browser:true*/
define([
  'jquery',
  'faye',
  'log!realtime',
  '../utils/momentWrapper'
], function($, Faye, log, moment) {
  "use strict";

  //Faye.Logging.logLevel = 'info';

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

  var _subscriptions = {};
  var _id = 0;
  function SubscriptionClient(client, channel, callback) {
    this._id = _id++;
    this._callback = callback;
    this._channel = channel;
    _subscriptions[this._id] = this;
    this._connect(client);
  }

  SubscriptionClient.prototype = {
    _connect: function(client) {
      log('Resubscribing to ' + this._channel);
      var self = this;
      this._subscription = client.subscribe(this._channel, this._callback);

      this._subscription.callback(function() {
        log('Successfully resubscribed to ' + self._channel);

        if(self._subscriptionCalled) return;
        self._subscriptionCalled = true;

        if(self._subscribeCallback) self._subscribeCallback();
      });

      this._subscription.errback(function(error) {
        if(self._errorCallback) self._errorCallback(error);
      });
    },

    callback: function(subscribeCallback) {
      this._subscribeCallback = subscribeCallback;
    },

    errback: function(errorCallback) {
      this._errorCallback = errorCallback;
    },

    cancel: function() {
      delete _subscriptions[this._id];
      this._subscription.cancel();
    }
  };


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

    var client = new Faye.Client(c.fayeUrl, c.options);

    if(c.disable) {
      for(var i = 0; i < c.length; i++) {
        client.disable(c.disable[i]);
      }
    }

    client.addExtension(new ClientAuth());
    client.addExtension(subscriptionTimestampExtension);

    client.connect(function() {});

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

    _.each(_.values(_subscriptions), function(subscription){
      subscription._connect(client);
    });

    monitorConnection();

    // TODO: this stuff below really should find a better home
    if(window.troupeContext && window.troupeContext.troupe) {
      new SubscriptionClient(client, '/troupes/' + window.troupeContext.troupe.id, function(message) {
        log("Subscription!", message);
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

    return client;
  }

  function disconnectClient(client) {
    client.unbind('transport:up');
    client.unbind('transport:down');
    client.disconnect();
  }


  // Give the initial load 5 seconds to connect before warning the user that there is a problem
  connectionProblemTimeoutHandle = window.setTimeout(connectionProblemTimeout, 5000);



  function recycleConnection() {
    log('Recycling connection');
    disconnectClient(_client);
    _client = createClient();
  }


  function fakeSubscription() {
    if(!_client) return;

    log('Attempting to subscribe to /ping');

    var subscription = _client.subscribe('/ping', function() { });

    subscription.callback(function() {
      if(timeout) window.clearTimeout(timeout);
      subscription.cancel();
    });

    subscription.errback(function(error) {
      log('Error while subscribing to ping channel', error);
      if(timeout) window.clearTimeout(timeout);
      recycleConnection();
      subscription.cancel();
    });

    var timeout = window.setTimeout(function() {
      log('Timeout while waiting for ping subscription');
      recycleConnection();
      subscription.cancel();
    }, 30000);

  }

  var monitorConnection = _.once(function() {
    window.setInterval(fakeSubscription, 60000);

    $(document).on('reawaken', function() {
      log('Recycling connection after reawaken');
      recycleConnection();
    });

    // Cordova events.... doesn't matter if IE8 doesn't handle them
    if(document.addEventListener) {
      document.addEventListener("offline", function() { log('realtime: offline'); }, false);
      document.addEventListener("online", function() { log('realtime: online'); fakeSubscription(); }, false);
    }

  });

  var _client;
  function getOrCreateClient() {
    if(_client) return _client;
    _client = createClient();
    return _client;
  }

  return {
    getClientId: function() {
      return getOrCreateClient().getClientId();
    },

    subscribe: function(channel, callback) {
      return new SubscriptionClient(getOrCreateClient(), channel, callback);
    },

    getClient: function() {
      return getOrCreateClient();
    },

    getSubscriptionTimestamp: function(channel) {
      return subscriptionTimestampExtension._getTimestamp(channel);
    }
  };
});