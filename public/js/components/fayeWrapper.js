/*jshint unused:true, browser:true*/
define([
  'faye',
  'log!fayeWrapper'
], function(Faye, log) {
  "use strict";

  Faye.Logging.logLevel = 'info';

  function SubscriptionClient(wrapper, channel, onMessage, context) {
    this._wrapper = wrapper;
    this._channel = channel;
    this._onMessage = onMessage;
    this._onMessageContext = context;
    this._underlyingSubscription = null;
  }

  SubscriptionClient.prototype = {
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
      for(var i = 0; i < this._disabled.length; i++) c.disable(this._disabled[i]);
      for(var j in this._headers) {
        if(this._headers.hasOwnProperty(j)) {
          c.setHeader(k, this._headers[j]);
        }
      }

      for (var l = 0; this._extensions && l < this._extensions.length; l++) {
        c.addExtension(this._extensions[i]);
      }

      this._client = c;
      return c;
    },

    recycle: function(callback, context) {
      for(var i = 0; i < this._subscriptions.length; i++) {
        this._subscriptions[i]._clearUnderlyingSubscription();
      }

      if(this._client) {
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
        this._resubscribe();

        if(callback) callback.apply(context, arguments);
      }, this);
    },

    disconnect: function() {
      this._getClient().disconnect();
    },

    subscribe: function(channel, callback, context) {
      var subscription = new SubscriptionClient(this, channel, callback, context);
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

    }
  };

  return FayeWrapper;

});