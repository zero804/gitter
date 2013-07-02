  /*jshint unused:strict, browser:true */
define([
  'faye',
  'underscore',
  'log!fayeWrapper'
], function(Faye, _, log) {
  "use strict";

  Faye.Logging.logLevel = 'info';

  function SubscriptionWrapper(wrapper, channel, onMessage, context) {
    this._wrapper = wrapper;
    this._channel = channel;
    this._onMessage = onMessage;
    this._onMessageContext = context;
    this._underlyingSubscription = null;
  }

  SubscriptionWrapper.prototype = {
    _setUnderlyingSubscription: function(underlyingSubscription) {
      this._underlyingSubscription = underlyingSubscription;

      if(this._callback) {
        underlyingSubscription.callback(this._callback, this._callbackContext);
      }

      if(this._errorCallback) {
        underlyingSubscription.errback(this._errorCallback, this._errorContext);
      }

    },

    _clearUnderlyingSubscription: function() {
      this._underlyingSubscription = null;
    },

    callback: function(callback, context) {
      this._callback = callback;
      this._callbackContext = context;

      if(this._underlyingSubscription) {
        this._underlyingSubscription.callback(callback, context);
      }
    },

    errback: function(errorCallback, context) {
      this._errorCallback = errorCallback;
      this._errorContext = context;

      if(this._underlyingSubscription) {
        this._underlyingSubscription.errback(errorCallback, context);
      }
    },

    cancel: function() {
      wrapper.unsubscribe(this._channel, this._onMessage, this._onMessageContext);
    }
  };

  var FayeWrapper = function(endpoint, options) {
    this._endpoint = endpoint;
    this._options = options;
    this._disabled = [];
    this._headers = {};
    this._subscriptions = [];
    this._fayeFactory = options && options.fayeFactory || this._fayeFactory.bind(this);
  };

  FayeWrapper.prototype = {
    _fayeFactory: function(endpoint, options) {
      return new Faye.Client(endpoint, options);
    },

    _getClient: function() {
      if(this._client) return this._client;

      var c = this._fayeFactory(this._endpoint, this._options);
      this._bindClient(c);


      for(var i = 0; i < this._disabled.length; i++) c.disable(this._disabled[i]);
      for(var j in this._headers) {
        if(this._headers.hasOwnProperty(j)) {
          c.setHeader(k, this._headers[j]);
        }
      }

      for (var l = 0; this._extensions && l < this._extensions.length; l++) {
        c.addExtension(this._extensions[l]);
      }

      this._client = c;
      this._resubscribe();

      this._startConnectionMonitor();

      return c;
    },

    recycle: function(callback, context) {
      for(var i = 0; i < this._subscriptions.length; i++) {
        this._subscriptions[i]._clearUnderlyingSubscription();
      }

      if(this._client) {
        this._unbindClient(this._client);
        this._client.disconnect();
      }

      this._client = null;
      this.connect(callback, context);
    },

    _resubscribe: function() {
      for(var k = 0; k < this._subscriptions.length; k++) {
        var s = this._subscriptions[k];

        var underlying = this._client.subscribe(s._channel, s._onMessage, s._onMessageContext);
        s._setUnderlyingSubscription(underlying);
      }
    },

    disable: function(feature) {
      this._disabled.push(feature);
    },

    setHeader: function(name, value) {
      this._headers[name] = value;
    },

    getClientId: function() {
      return this._getClient().getClientId();
    },

    getState: function() {
      if(!this._client) return 'UNCONNECTED';

      return this._client.getState();
    },

    connect: function(callback, context) {
      this._getClient().connect(function() {
        if(callback) callback.apply(context, arguments);
      }, this);
    },

    disconnect: function() {
      if(this._client) {
        this._stopConnectionMonitor();
        this._client.disconnect();
      }
    },

    subscribe: function(channel, callback, context) {
      var subscription = new SubscriptionWrapper(this, channel, callback, context);
      this._subscriptions.push(subscription);

      if(this._client) {
        var underlying = this._client.subscribe(channel, callback, context);
        subscription._setUnderlyingSubscription(underlying);
      }

      return subscription;
    },

    unsubscribe: function(channel, callback, context) {
      var client = this._getClient();

      for(var i = this._subscriptions.length - 1; i >= 0; i++) {
        var s = this._subscriptions[i];

        if(s.channel !== channel) continue;
        if(s._onMessage !== callback) continue;
        if(s._onMessageContext !== context) continue;
        this._subscriptions.splice(i, 1);

        client.unsubscribe(channel, callback, context);
      }
    },

    publish: function(channel, data) {
      this._getClient().publish(channel, data);
    },

    addExtension: function(extension) {
      this._extensions = this._extensions || [];
      this._extensions.push(extension);
      if(this._client) this._client.addExtension(extension);
    },

    removeExtension: function(extension) {
      if (!this._extensions) return;
      var i = this._extensions.length;
      while (i--) {
        if (this._extensions[i] !== extension) continue;
        this._extensions.splice(i,1);
      }

      if(this._client) this._client.removeExtension(extension);
    },

    bind: function(eventType, listener, context) {
      this._subscribers = this._subscribers || {};
      var list = this._subscribers[eventType] = this._subscribers[eventType] || [];
      list.push([listener, context]);

      if(this._client) this._client.bind(eventType, listener, context);
    },

    unbind: function(eventType, listener, context) {
      if(this._subscribers && this._subscribers[eventType]) {

        if (!listener) {
          delete this._subscribers[eventType];
        } else {
          var list = this._subscribers[eventType],
              i    = list.length;

          while (i--) {
            if (listener !== list[i][0]) continue;
            if (context && list[i][1] !== context) continue;
            list.splice(i,1);
          }
        }
      }

      if(this._client) this._client.unbind(eventType, listener, context);
    },

    trigger: function() {
      var args = Array.prototype.slice.call(arguments),
          eventType = args.shift();

      if (!this._subscribers || !this._subscribers[eventType]) return;

      var listeners = this._subscribers[eventType].slice(),
          listener;

      for (var i = 0, n = listeners.length; i < n; i++) {
        listener = listeners[i];
        listener[0].apply(listener[1], args);
      }
    },

    _unbindClient: function(client) {
      if(!this._subscribers) return;
      for(var key in this._subscribers) {
        if(!this._subscribers.hasOwnProperty(key)) continue;
        client.unbind(key);
      }
    },

    _bindClient: function(client) {
      if(!this._subscribers) return;
      for(var key in this._subscribers) {
        if(!this._subscribers.hasOwnProperty(key)) continue;

        var events = this._subscribers[key];
        for(var i = 0; i < events.length; i++) {
          client.bind(key, events[i][0], events[i][1]);
        }
      }
    },

    _ping: function() {
      if(!this._client) return;

      var startTime = Date.now();
      var connectionTimeoutPeriod = 30000;
      var timeout;

      var clientId = this._client.getClientId();

      log('Attempting to subscribe to /ping');

      var subscription = this._client.subscribe('/ping', function() { });

      subscription.callback(function() {
        if(timeout) clearTimeout(timeout);
        subscription.cancel();
      });

      subscription.errback(function(error) {
        log('Error while subscribing to ping channel', error);
        if(timeout) window.clearTimeout(timeout);
        subscription.cancel();

        var clientId2 = this._client.getClientId();

        if(clientId2 !== clientId) {
          log('Faye client recycled during ping');
          return;
        }

        if((Date.now() - startTime) > (connectionTimeoutPeriod * 1.1)) {
          log('Ping subscription interrupted');
          return;
        }

        this.recycle();

      }.bind(this));

      timeout = window.setTimeout(function() {
        log('Timeout while waiting for ping subscription');
        subscription.cancel();

        var clientId2 = this._client.getClientId();

        if(clientId2 !== clientId) {
          log('Faye client recycled during ping');
          return;
        }

        if((Date.now() - startTime) > (connectionTimeoutPeriod * 1.1)) {
          log('Ping subscription interrupted');
          return;
        }

        this.recycle();

      }.bind(this), connectionTimeoutPeriod);
    },

    _startConnectionMonitor: function() {
      // Reset the time on the pinger if it already exists
      if(this._monitorTimeout) {
        clearTimeout(this._monitorTimeout);
      }

      this._monitorTimeout = setInterval(function() {
        this._ping();
      }.bind(this), 60000);
    },

    _stopConnectionMonitor: function() {
      if(!this._monitorTimeout) return;
      clearTimeout(this._monitorTimeout);
      this._monitorTimeout = null;
    }


  };

  return FayeWrapper;

});