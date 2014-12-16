(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define(factory);
	else if(typeof exports === 'object')
		exports["Faye"] = factory();
	else
		root["Faye"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye_Client = __webpack_require__(1);
	__webpack_require__(28);
	__webpack_require__(3);
	__webpack_require__(4);
	__webpack_require__(5);
	__webpack_require__(6);

	module.exports = Faye_Client;


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);
	var Faye_Class = __webpack_require__(15);
	var Faye_Extensible = __webpack_require__(9);
	var Faye_Publisher = __webpack_require__(22);
	var Faye_Logging = __webpack_require__(21);
	var Faye_Error = __webpack_require__(10);
	var Faye_Channel = __webpack_require__(11);
	var Faye_Dispatcher = __webpack_require__(12);
	var Faye_Event = __webpack_require__(19);
	var Faye_Promise = __webpack_require__(17);
	var Faye_Subscription = __webpack_require__(13);
	var Faye_Publication = __webpack_require__(14);
	var Faye_URI = __webpack_require__(16);
	var Faye_Promise = __webpack_require__(17);
	var Faye_Deferrable = __webpack_require__(20);

	var Faye_Client = Faye_Class({
	  UNCONNECTED:        1,
	  CONNECTING:         2,
	  CONNECTED:          3,
	  DISCONNECTED:       4,

	  HANDSHAKE:          'handshake',
	  RETRY:              'retry',
	  NONE:               'none',

	  CONNECTION_TIMEOUT: 60,

	  DEFAULT_ENDPOINT:   '/bayeux',
	  INTERVAL:           0,

	  initialize: function(endpoint, options) {
	    this.info('New client created for ?', endpoint);
	    options = options || {};

	    this._endpoint   = endpoint || this.DEFAULT_ENDPOINT;
	    this._channels   = new Faye_Channel.Set();
	    this._dispatcher = new Faye_Dispatcher(this, this._endpoint, options);

	    this._messageId = 0;
	    this._state     = this.UNCONNECTED;

	    this._responseCallbacks = {};

	    this._advice = {
	      reconnect: this.RETRY,
	      interval:  1000 * (options.interval || this.INTERVAL),
	      timeout:   1000 * (options.timeout  || this.CONNECTION_TIMEOUT)
	    };
	    this._dispatcher.timeout = this._advice.timeout / 1000;

	    this._dispatcher.bind('message', this._receiveMessage, this);

	    if (Faye_Event && Faye.ENV.onbeforeunload !== undefined)
	      Faye_Event.on(Faye.ENV, 'beforeunload', function() {
	        if (Faye.indexOf(this._dispatcher._disabled, 'autodisconnect') < 0)
	          this.disconnect();
	      }, this);
	  },

	  disable: function(feature) {
	    return this._dispatcher.disable(feature);
	  },

	  setHeader: function(name, value) {
	    return this._dispatcher.setHeader(name, value);
	  },

	  // Request
	  // MUST include:  * channel
	  //                * version
	  //                * supportedConnectionTypes
	  // MAY include:   * minimumVersion
	  //                * ext
	  //                * id
	  //
	  // Success Response                             Failed Response
	  // MUST include:  * channel                     MUST include:  * channel
	  //                * version                                    * successful
	  //                * supportedConnectionTypes                   * error
	  //                * clientId                    MAY include:   * supportedConnectionTypes
	  //                * successful                                 * advice
	  // MAY include:   * minimumVersion                             * version
	  //                * advice                                     * minimumVersion
	  //                * ext                                        * ext
	  //                * id                                         * id
	  //                * authSuccessful
	  handshake: function(callback, context) {
	    if (this._advice.reconnect === this.NONE) return;
	    if (this._state !== this.UNCONNECTED) return;

	    this._state = this.CONNECTING;
	    var self = this;

	    this.info('Initiating handshake with ?', Faye_URI.stringify(this._endpoint));
	    this._dispatcher.selectTransport(Faye.MANDATORY_CONNECTION_TYPES);

	    this._sendMessage({
	      channel:                  Faye_Channel.HANDSHAKE,
	      version:                  Faye.BAYEUX_VERSION,
	      supportedConnectionTypes: this._dispatcher.getConnectionTypes()

	    }, {}, function(response) {

	      if (response.successful) {
	        this._state = this.CONNECTED;
	        this._dispatcher.clientId  = response.clientId;

	        this._dispatcher.selectTransport(response.supportedConnectionTypes);

	        this.info('Handshake successful: ?', this._dispatcher.clientId);

	        this.subscribe(this._channels.getKeys(), true);
	        if (callback) Faye_Promise.defer(function() { callback.call(context) });

	      } else {
	        this.info('Handshake unsuccessful');
	        Faye.ENV.setTimeout(function() { self.handshake(callback, context) }, this._dispatcher.retry * 1000);
	        this._state = this.UNCONNECTED;
	      }
	    }, this);
	  },

	  // Request                              Response
	  // MUST include:  * channel             MUST include:  * channel
	  //                * clientId                           * successful
	  //                * connectionType                     * clientId
	  // MAY include:   * ext                 MAY include:   * error
	  //                * id                                 * advice
	  //                                                     * ext
	  //                                                     * id
	  //                                                     * timestamp
	  connect: function(callback, context) {
	    if (this._advice.reconnect === this.NONE) return;
	    if (this._state === this.DISCONNECTED) return;

	    if (this._state === this.UNCONNECTED)
	      return this.handshake(function() { this.connect(callback, context) }, this);

	    this.callback(callback, context);
	    if (this._state !== this.CONNECTED) return;

	    this.info('Calling deferred actions for ?', this._dispatcher.clientId);
	    this.setDeferredStatus('succeeded');
	    this.setDeferredStatus('unknown');

	    if (this._connectRequest) return;
	    this._connectRequest = true;

	    this.info('Initiating connection for ?', this._dispatcher.clientId);

	    this._sendMessage({
	      channel:        Faye_Channel.CONNECT,
	      clientId:       this._dispatcher.clientId,
	      connectionType: this._dispatcher.connectionType

	    }, {}, this._cycleConnection, this);
	  },

	  // Request                              Response
	  // MUST include:  * channel             MUST include:  * channel
	  //                * clientId                           * successful
	  // MAY include:   * ext                                * clientId
	  //                * id                  MAY include:   * error
	  //                                                     * ext
	  //                                                     * id
	  disconnect: function() {
	    if (this._state !== this.CONNECTED) return;
	    this._state = this.DISCONNECTED;

	    this.info('Disconnecting ?', this._dispatcher.clientId);

	    this._sendMessage({
	      channel:  Faye_Channel.DISCONNECT,
	      clientId: this._dispatcher.clientId

	    }, {}, function(response) {
	      if (response.successful) this._dispatcher.close();
	    }, this);

	    this.info('Clearing channel listeners for ?', this._dispatcher.clientId);
	    this._channels = new Faye_Channel.Set();
	  },

	  // Request                              Response
	  // MUST include:  * channel             MUST include:  * channel
	  //                * clientId                           * successful
	  //                * subscription                       * clientId
	  // MAY include:   * ext                                * subscription
	  //                * id                  MAY include:   * error
	  //                                                     * advice
	  //                                                     * ext
	  //                                                     * id
	  //                                                     * timestamp
	  subscribe: function(channel, callback, context) {
	    if (channel instanceof Array)
	      return Faye.map(channel, function(c) {
	        return this.subscribe(c, callback, context);
	      }, this);

	    var subscription = new Faye_Subscription(this, channel, callback, context),
	        force        = (callback === true),
	        hasSubscribe = this._channels.hasSubscription(channel);

	    if (hasSubscribe && !force) {
	      this._channels.subscribe([channel], callback, context);
	      subscription.setDeferredStatus('succeeded');
	      return subscription;
	    }

	    this.connect(function() {
	      this.info('Client ? attempting to subscribe to ?', this._dispatcher.clientId, channel);
	      if (!force) this._channels.subscribe([channel], callback, context);

	      this._sendMessage({
	        channel:      Faye_Channel.SUBSCRIBE,
	        clientId:     this._dispatcher.clientId,
	        subscription: channel

	      }, {}, function(response) {
	        if (!response.successful) {
	          subscription.setDeferredStatus('failed', Faye_Error.parse(response.error));
	          return this._channels.unsubscribe(channel, callback, context);
	        }

	        var channels = [].concat(response.subscription);
	        this.info('Subscription acknowledged for ? to ?', this._dispatcher.clientId, channels);
	        subscription.setDeferredStatus('succeeded');
	      }, this);
	    }, this);

	    return subscription;
	  },

	  // Request                              Response
	  // MUST include:  * channel             MUST include:  * channel
	  //                * clientId                           * successful
	  //                * subscription                       * clientId
	  // MAY include:   * ext                                * subscription
	  //                * id                  MAY include:   * error
	  //                                                     * advice
	  //                                                     * ext
	  //                                                     * id
	  //                                                     * timestamp
	  unsubscribe: function(channel, callback, context) {
	    if (channel instanceof Array)
	      return Faye.map(channel, function(c) {
	        return this.unsubscribe(c, callback, context);
	      }, this);

	    var dead = this._channels.unsubscribe(channel, callback, context);
	    if (!dead) return;

	    this.connect(function() {
	      this.info('Client ? attempting to unsubscribe from ?', this._dispatcher.clientId, channel);

	      this._sendMessage({
	        channel:      Faye_Channel.UNSUBSCRIBE,
	        clientId:     this._dispatcher.clientId,
	        subscription: channel

	      }, {}, function(response) {
	        if (!response.successful) return;

	        var channels = [].concat(response.subscription);
	        this.info('Unsubscription acknowledged for ? from ?', this._dispatcher.clientId, channels);
	      }, this);
	    }, this);
	  },

	  // Request                              Response
	  // MUST include:  * channel             MUST include:  * channel
	  //                * data                               * successful
	  // MAY include:   * clientId            MAY include:   * id
	  //                * id                                 * error
	  //                * ext                                * ext
	  publish: function(channel, data, options) {
	    var publication = new Faye_Publication();

	    this.connect(function() {
	      this.info('Client ? queueing published message to ?: ?', this._dispatcher.clientId, channel, data);

	      this._sendMessage({
	        channel:  channel,
	        data:     data,
	        clientId: this._dispatcher.clientId

	      }, options, function(response) {
	        if (response.successful)
	          publication.setDeferredStatus('succeeded');
	        else
	          publication.setDeferredStatus('failed', Faye_Error.parse(response.error));
	      }, this);
	    }, this);

	    return publication;
	  },

	  reset: function() {
	    this._dispatcher.close();
	    this._state = this.UNCONNECTED;
	    this._cycleConnection();
	  },

	  _sendMessage: function(message, options, callback, context) {
	    message.id = this._generateMessageId();

	    var timeout = this._advice.timeout
	                ? 1.2 * this._advice.timeout / 1000
	                : 1.2 * this._dispatcher.retry;

	    this.pipeThroughExtensions('outgoing', message, null, function(message) {
	      if (!message) return;
	      if (callback) this._responseCallbacks[message.id] = [callback, context];
	      this._dispatcher.sendMessage(message, timeout, options || {});
	    }, this);
	  },

	  _generateMessageId: function() {
	    this._messageId += 1;
	    if (this._messageId >= Math.pow(2,32)) this._messageId = 0;
	    return this._messageId.toString(36);
	  },

	  _receiveMessage: function(message) {
	    var id = message.id, callback;

	    if (message.successful !== undefined) {
	      callback = this._responseCallbacks[id];
	      delete this._responseCallbacks[id];
	    }

	    this.pipeThroughExtensions('incoming', message, null, function(message) {
	      if (!message) return;
	      if (message.advice) this._handleAdvice(message.advice);
	      this._deliverMessage(message);
	      if (callback) callback[0].call(callback[1], message);
	    }, this);
	  },

	  _handleAdvice: function(advice) {
	    Faye.extend(this._advice, advice);
	    this._dispatcher.timeout = this._advice.timeout / 1000;

	    if (this._advice.reconnect === this.HANDSHAKE && this._state !== this.DISCONNECTED) {
	      this._state = this.UNCONNECTED;
	      this._dispatcher.clientId = null;
	      this._cycleConnection();
	    }
	  },

	  _deliverMessage: function(message) {
	    if (!message.channel || message.data === undefined) return;
	    this.info('Client ? calling listeners for ? with ?', this._dispatcher.clientId, message.channel, message.data);
	    this._channels.distributeMessage(message);
	  },

	  _cycleConnection: function() {
	    if (this._connectRequest) {
	      this._connectRequest = null;
	      this.info('Closed connection for ?', this._dispatcher.clientId);
	    }
	    var self = this;
	    Faye.ENV.setTimeout(function() { self.connect() }, this._advice.interval);
	  }
	});

	Faye.extend(Faye_Client.prototype, Faye_Deferrable);
	Faye.extend(Faye_Client.prototype, Faye_Publisher);
	Faye.extend(Faye_Client.prototype, Faye_Logging);
	Faye.extend(Faye_Client.prototype, Faye_Extensible);

	module.exports = Faye_Client;


/***/ },
/* 2 */,
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);
	var Faye_Class = __webpack_require__(15);
	var Faye_Transport = __webpack_require__(8);
	var Faye_URI = __webpack_require__(16);
	var Faye_Deferrable = __webpack_require__(20);
	var Faye_Transport_XHR = __webpack_require__(4);

	var Faye_Transport_EventSource = Faye.extend(Faye_Class(Faye_Transport, {
	  initialize: function(dispatcher, endpoint) {
	    Faye_Transport.prototype.initialize.call(this, dispatcher, endpoint);
	    if (!Faye.ENV.EventSource) return this.setDeferredStatus('failed');

	    this._xhr = new Faye_Transport_XHR(dispatcher, endpoint);

	    endpoint = Faye.copyObject(endpoint);
	    endpoint.pathname += '/' + dispatcher.clientId;

	    var socket = new EventSource(Faye_URI.stringify(endpoint)),
	        self   = this;

	    socket.onopen = function() {
	      self._everConnected = true;
	      self.setDeferredStatus('succeeded');
	    };

	    socket.onerror = function() {
	      if (self._everConnected) {
	        self._handleError([]);
	      } else {
	        self.setDeferredStatus('failed');
	        socket.close();
	      }
	    };

	    socket.onmessage = function(event) {
	      self._receive(JSON.parse(event.data));
	    };

	    this._socket = socket;
	  },

	  close: function() {
	    if (!this._socket) return;
	    this._socket.onopen = this._socket.onerror = this._socket.onmessage = null;
	    this._socket.close();
	    delete this._socket;
	  },

	  isUsable: function(callback, context) {
	    this.callback(function() { callback.call(context, true) });
	    this.errback(function() { callback.call(context, false) });
	  },

	  encode: function(messages) {
	    return this._xhr.encode(messages);
	  },

	  request: function(messages) {
	    return this._xhr.request(messages);
	  }

	}), {
	  isUsable: function(dispatcher, endpoint, callback, context) {
	    var id = dispatcher.clientId;
	    if (!id) return callback.call(context, false);

	    Faye_Transport_XHR.isUsable(dispatcher, endpoint, function(usable) {
	      if (!usable) return callback.call(context, false);
	      this.create(dispatcher, endpoint).isUsable(callback, context);
	    }, this);
	  },

	  create: function(dispatcher, endpoint) {
	    var sockets = dispatcher.transports.eventsource = dispatcher.transports.eventsource || {},
	        id      = dispatcher.clientId;

	    endpoint = Faye.copyObject(endpoint);
	    endpoint.pathname += '/' + (id || '');
	    var url = Faye_URI.stringify(endpoint);

	    sockets[url] = sockets[url] || new this(dispatcher, endpoint);
	    return sockets[url];
	  }
	});

	Faye.extend(Faye_Transport_EventSource.prototype, Faye_Deferrable);
	Faye_Transport.register('eventsource', Faye_Transport_EventSource);

	module.exports = Faye_Transport_EventSource;


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);
	var Faye_Class = __webpack_require__(15);
	var Faye_Transport = __webpack_require__(8);
	var Faye_URI = __webpack_require__(16);
	var Faye_Event = __webpack_require__(19);

	var Faye_Transport_XHR = Faye.extend(Faye_Class(Faye_Transport, {
	  encode: function(messages) {
	    return Faye.toJSON(messages);
	  },

	  request: function(messages) {
	    var href = this.endpoint.href,
	        xhr  = Faye.ENV.ActiveXObject ? new ActiveXObject('Microsoft.XMLHTTP') : new XMLHttpRequest(),
	        self = this;

	    xhr.open('POST', href, true);
	    xhr.setRequestHeader('Content-Type', 'application/json');
	    xhr.setRequestHeader('Pragma', 'no-cache');
	    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

	    var headers = this._dispatcher.headers;
	    for (var key in headers) {
	      if (!headers.hasOwnProperty(key)) continue;
	      xhr.setRequestHeader(key, headers[key]);
	    }

	    var abort = function() { xhr.abort() };
	    if (Faye.ENV.onbeforeunload !== undefined) Faye_Event.on(Faye.ENV, 'beforeunload', abort);

	    xhr.onreadystatechange = function() {
	      if (!xhr || xhr.readyState !== 4) return;

	      var replies    = null,
	          status     = xhr.status,
	          text       = xhr.responseText,
	          successful = (status >= 200 && status < 300) || status === 304 || status === 1223;

	      if (Faye.ENV.onbeforeunload !== undefined) Faye_Event.detach(Faye.ENV, 'beforeunload', abort);
	      xhr.onreadystatechange = function() {};
	      xhr = null;

	      if (!successful) return self._handleError(messages);

	      try {
	        replies = JSON.parse(text);
	      } catch (e) {}

	      if (replies)
	        self._receive(replies);
	      else
	        self._handleError(messages);
	    };

	    xhr.send(this.encode(messages));
	    return xhr;
	  }
	}), {
	  isUsable: function(dispatcher, endpoint, callback, context) {
	    callback.call(context, Faye_URI.isSameOrigin(endpoint));
	  }
	});

	Faye_Transport.register('long-polling', Faye_Transport_XHR);


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);
	var Faye_Class = __webpack_require__(15);
	var Faye_Transport = __webpack_require__(8);
	var Faye_URI = __webpack_require__(16);

	var Faye_Transport_CORS = Faye.extend(Faye_Class(Faye_Transport, {
	  encode: function(messages) {
	    return 'message=' + encodeURIComponent(Faye.toJSON(messages));
	  },

	  request: function(messages) {
	    var xhrClass = Faye.ENV.XDomainRequest ? XDomainRequest : XMLHttpRequest,
	        xhr      = new xhrClass(),
	        headers  = this._dispatcher.headers,
	        self     = this,
	        key;

	    xhr.open('POST', Faye_URI.stringify(this.endpoint), true);

	    if (xhr.setRequestHeader) {
	      xhr.setRequestHeader('Pragma', 'no-cache');
	      for (key in headers) {
	        if (!headers.hasOwnProperty(key)) continue;
	        xhr.setRequestHeader(key, headers[key]);
	      }
	    }

	    var cleanUp = function() {
	      if (!xhr) return false;
	      xhr.onload = xhr.onerror = xhr.ontimeout = xhr.onprogress = null;
	      xhr = null;
	    };

	    xhr.onload = function() {
	      var replies = null;
	      try {
	        replies = JSON.parse(xhr.responseText);
	      } catch (e) {}

	      cleanUp();

	      if (replies)
	        self._receive(replies);
	      else
	        self._handleError(messages);
	    };

	    xhr.onerror = xhr.ontimeout = function() {
	      cleanUp();
	      self._handleError(messages);
	    };

	    xhr.onprogress = function() {};
	    xhr.send(this.encode(messages));
	    return xhr;
	  }
	}), {
	  isUsable: function(dispatcher, endpoint, callback, context) {
	    if (Faye_URI.isSameOrigin(endpoint))
	      return callback.call(context, false);

	    if (Faye.ENV.XDomainRequest)
	      return callback.call(context, endpoint.protocol === Faye.ENV.location.protocol);

	    if (Faye.ENV.XMLHttpRequest) {
	      var xhr = new Faye.ENV.XMLHttpRequest();
	      return callback.call(context, xhr.withCredentials !== undefined);
	    }
	    return callback.call(context, false);
	  }
	});

	Faye_Transport.register('cross-origin-long-polling', Faye_Transport_CORS);

	module.exports = Faye_Transport_CORS;


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);
	var Faye_Class = __webpack_require__(15);
	var Faye_Transport = __webpack_require__(8);
	var Faye_URI = __webpack_require__(16);

	var Faye_Transport_JSONP = Faye.extend(Faye_Class(Faye_Transport, {
	 encode: function(messages) {
	    var url = Faye.copyObject(this.endpoint);
	    url.query.message = Faye.toJSON(messages);
	    url.query.jsonp   = '__jsonp' + Faye_Transport_JSONP._cbCount + '__';
	    return Faye_URI.stringify(url);
	  },

	  request: function(messages) {
	    var head         = document.getElementsByTagName('head')[0],
	        script       = document.createElement('script'),
	        callbackName = Faye_Transport_JSONP.getCallbackName(),
	        endpoint     = Faye.copyObject(this.endpoint),
	        self         = this;

	    endpoint.query.message = Faye.toJSON(messages);
	    endpoint.query.jsonp   = callbackName;

	    var cleanup = function() {
	      if (!Faye.ENV[callbackName]) return false;
	      Faye.ENV[callbackName] = undefined;
	      try { delete Faye.ENV[callbackName] } catch (e) {}
	      script.parentNode.removeChild(script);
	    };

	    Faye.ENV[callbackName] = function(replies) {
	      cleanup();
	      self._receive(replies);
	    };

	    script.type = 'text/javascript';
	    script.src  = Faye_URI.stringify(endpoint);
	    head.appendChild(script);

	    script.onerror = function() {
	      cleanup();
	      self._handleError(messages);
	    };

	    return {abort: cleanup};
	  }
	}), {
	  _cbCount: 0,

	  getCallbackName: function() {
	    this._cbCount += 1;
	    return '__jsonp' + this._cbCount + '__';
	  },

	  isUsable: function(dispatcher, endpoint, callback, context) {
	    callback.call(context, true);
	  }
	});

	Faye_Transport.register('callback-polling', Faye_Transport_JSONP);

	module.exports = Faye_Transport_JSONP;


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	var Faye = {
	  VERSION:          '1.0.3',

	  BAYEUX_VERSION:   '1.0',
	  ID_LENGTH:        160,
	  JSONP_CALLBACK:   'jsonpcallback',
	  CONNECTION_TYPES: ['long-polling', 'cross-origin-long-polling', 'callback-polling', 'websocket', 'eventsource', 'in-process'],

	  MANDATORY_CONNECTION_TYPES: ['long-polling', 'callback-polling', 'in-process'],

	  ENV: (typeof window !== 'undefined') ? window : global,

	  extend: function(dest, source, overwrite) {
	    if (!source) return dest;
	    for (var key in source) {
	      if (!source.hasOwnProperty(key)) continue;
	      if (dest.hasOwnProperty(key) && overwrite === false) continue;
	      if (dest[key] !== source[key])
	        dest[key] = source[key];
	    }
	    return dest;
	  },

	  random: function(bitlength) {
	    bitlength = bitlength || this.ID_LENGTH;
	    var maxLength = Math.ceil(bitlength * Math.log(2) / Math.log(36));
	    var string = csprng(bitlength, 36);
	    while (string.length < maxLength) string = '0' + string;
	    return string;
	  },

	  clientIdFromMessages: function(messages) {
	    var connect = this.filter([].concat(messages), function(message) {
	      return message.channel === '/meta/connect';
	    });
	    return connect[0] && connect[0].clientId;
	  },

	  copyObject: function(object) {
	    var clone, i, key;
	    if (object instanceof Array) {
	      clone = [];
	      i = object.length;
	      while (i--) clone[i] = Faye.copyObject(object[i]);
	      return clone;
	    } else if (typeof object === 'object') {
	      clone = (object === null) ? null : {};
	      for (key in object) clone[key] = Faye.copyObject(object[key]);
	      return clone;
	    } else {
	      return object;
	    }
	  },

	  commonElement: function(lista, listb) {
	    for (var i = 0, n = lista.length; i < n; i++) {
	      if (this.indexOf(listb, lista[i]) !== -1)
	        return lista[i];
	    }
	    return null;
	  },

	  indexOf: function(list, needle) {
	    if (list.indexOf) return list.indexOf(needle);

	    for (var i = 0, n = list.length; i < n; i++) {
	      if (list[i] === needle) return i;
	    }
	    return -1;
	  },

	  map: function(object, callback, context) {
	    if (object.map) return object.map(callback, context);
	    var result = [];

	    if (object instanceof Array) {
	      for (var i = 0, n = object.length; i < n; i++) {
	        result.push(callback.call(context || null, object[i], i));
	      }
	    } else {
	      for (var key in object) {
	        if (!object.hasOwnProperty(key)) continue;
	        result.push(callback.call(context || null, key, object[key]));
	      }
	    }
	    return result;
	  },

	  filter: function(array, callback, context) {
	    if (array.filter) return array.filter(callback, context);
	    var result = [];
	    for (var i = 0, n = array.length; i < n; i++) {
	      if (callback.call(context || null, array[i], i))
	        result.push(array[i]);
	    }
	    return result;
	  },

	  asyncEach: function(list, iterator, callback, context) {
	    var n       = list.length,
	        i       = -1,
	        calls   = 0,
	        looping = false;

	    var iterate = function() {
	      calls -= 1;
	      i += 1;
	      if (i === n) return callback && callback.call(context);
	      iterator(list[i], resume);
	    };

	    var loop = function() {
	      if (looping) return;
	      looping = true;
	      while (calls > 0) iterate();
	      looping = false;
	    };

	    var resume = function() {
	      calls += 1;
	      loop();
	    };
	    resume();
	  },

	  // http://assanka.net/content/tech/2009/09/02/json2-js-vs-prototype/
	  toJSON: function(object) {
	    if (!this.stringify) return JSON.stringify(object);

	    return this.stringify(object, function(key, value) {
	      return (this[key] instanceof Array) ? this[key] : value;
	    });
	  }
	};

	module.exports = Faye;
	
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);
	var Faye_Class = __webpack_require__(15);
	var Faye_Timeouts = __webpack_require__(23);
	var Faye_Logging = __webpack_require__(21);
	var Faye_URI = __webpack_require__(16);
	var Faye_Promise = __webpack_require__(17);
	var Faye_Channel = __webpack_require__(11);

	var Faye_Transport = Faye.extend(Faye_Class({
	  DEFAULT_PORTS:    {'http:': 80, 'https:': 443, 'ws:': 80, 'wss:': 443},
	  SECURE_PROTOCOLS: ['https:', 'wss:'],
	  MAX_DELAY:        0,

	  batching:  true,

	  initialize: function(dispatcher, endpoint) {
	    this._dispatcher = dispatcher;
	    this.endpoint    = endpoint;
	    this._outbox     = [];
	    this._proxy      = Faye.extend({}, this._dispatcher.proxy);

	    // if (!this._proxy.origin && Faye_NodeAdapter) {
	    //   this._proxy.origin = Faye.indexOf(this.SECURE_PROTOCOLS, this.endpoint.protocol) >= 0
	    //                      ? (process.env.HTTPS_PROXY || process.env.https_proxy)
	    //                      : (process.env.HTTP_PROXY  || process.env.http_proxy);
	    // }
	  },

	  close: function() {},

	  encode: function(messages) {
	    return '';
	  },

	  sendMessage: function(message) {
	    this.debug('Client ? sending message to ?: ?',
	               this._dispatcher.clientId, Faye_URI.stringify(this.endpoint), message);

	    if (!this.batching) return Faye_Promise.fulfilled(this.request([message]));

	    this._outbox.push(message);
	    this._flushLargeBatch();
	    this._promise = this._promise || new Faye_Promise();

	    if (message.channel === Faye_Channel.HANDSHAKE) {
	      this.addTimeout('publish', 0.01, this._flush, this);
	      return this._promise;
	    }

	    if (message.channel === Faye_Channel.CONNECT)
	      this._connectMessage = message;

	    this.addTimeout('publish', this.MAX_DELAY, this._flush, this);
	    return this._promise;
	  },

	  _flush: function() {
	    this.removeTimeout('publish');

	    if (this._outbox.length > 1 && this._connectMessage)
	      this._connectMessage.advice = {timeout: 0};

	    Faye_Promise.fulfill(this._promise, this.request(this._outbox));
	    delete this._promise;

	    this._connectMessage = null;
	    this._outbox = [];
	  },

	  _flushLargeBatch: function() {
	    var string = this.encode(this._outbox);
	    if (string.length < this._dispatcher.maxRequestSize) return;
	    var last = this._outbox.pop();
	    this._flush();
	    if (last) this._outbox.push(last);
	  },

	  _receive: function(replies) {
	    replies = [].concat(replies);

	    this.debug('Client ? received from ? via ?: ?',
	               this._dispatcher.clientId, Faye_URI.stringify(this.endpoint), this.connectionType, replies);

	    for (var i = 0, n = replies.length; i < n; i++)
	      this._dispatcher.handleResponse(replies[i]);
	  },

	  _handleError: function(messages, immediate) {
	    messages = [].concat(messages);

	    this.debug('Client ? failed to send to ? via ?: ?',
	               this._dispatcher.clientId, Faye_URI.stringify(this.endpoint), this.connectionType, messages);

	    for (var i = 0, n = messages.length; i < n; i++)
	      this._dispatcher.handleError(messages[i]);
	  },

	  _getCookies: function() {
	    var cookies = this._dispatcher.cookies,
	        url     = Faye_URI.stringify(this.endpoint);

	    if (!cookies) return '';

	    return Faye.map(cookies.getCookiesSync(url), function(cookie) {
	      return cookie.cookieString();
	    }).join('; ');
	  },

	  _storeCookies: function(setCookie) {
	    var cookies = this._dispatcher.cookies,
	        url     = Faye_URI.stringify(this.endpoint),
	        cookie;

	    if (!setCookie || !cookies) return;
	    setCookie = [].concat(setCookie);

	    for (var i = 0, n = setCookie.length; i < n; i++) {
	      cookie = Faye.Cookies.Cookie.parse(setCookie[i]);
	      cookies.setCookieSync(cookie, url);
	    }
	  }

	}), {
	  get: function(dispatcher, allowed, disabled, callback, context) {
	    var endpoint = dispatcher.endpoint;

	    Faye.asyncEach(this._transports, function(pair, resume) {
	      var connType     = pair[0], klass = pair[1],
	          connEndpoint = dispatcher.endpointFor(connType);

	      if (Faye.indexOf(disabled, connType) >= 0)
	        return resume();

	      if (Faye.indexOf(allowed, connType) < 0) {
	        klass.isUsable(dispatcher, connEndpoint, function() {});
	        return resume();
	      }

	      klass.isUsable(dispatcher, connEndpoint, function(isUsable) {
	        if (!isUsable) return resume();
	        var transport = klass.hasOwnProperty('create') ? klass.create(dispatcher, connEndpoint) : new klass(dispatcher, connEndpoint);
	        console.log('USABLE?', connType, isUsable);
	        callback.call(context, transport);
	      });
	    }, function() {
	      throw new Error('Could not find a usable connection type for ' + Faye_URI.stringify(endpoint));
	    });
	  },

	  register: function(type, klass) {
	    this._transports.push([type, klass]);
	    klass.prototype.connectionType = type;
	  },

	  getConnectionTypes: function() {
	    return Faye.map(this._transports, function(t) { return t[0] });
	  },

	  _transports: []
	});

	Faye.extend(Faye_Transport.prototype, Faye_Logging);
	Faye.extend(Faye_Transport.prototype, Faye_Timeouts);

	module.exports = Faye_Transport;


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);
	var Faye_Logging = __webpack_require__(21);

	var Faye_Extensible = {
	  addExtension: function(extension) {
	    this._extensions = this._extensions || [];
	    this._extensions.push(extension);
	    if (extension.added) extension.added(this);
	  },

	  removeExtension: function(extension) {
	    if (!this._extensions) return;
	    var i = this._extensions.length;
	    while (i--) {
	      if (this._extensions[i] !== extension) continue;
	      this._extensions.splice(i,1);
	      if (extension.removed) extension.removed(this);
	    }
	  },

	  pipeThroughExtensions: function(stage, message, request, callback, context) {
	    this.debug('Passing through ? extensions: ?', stage, message);

	    if (!this._extensions) return callback.call(context, message);
	    var extensions = this._extensions.slice();

	    var pipe = function(message) {
	      if (!message) return callback.call(context, message);

	      var extension = extensions.shift();
	      if (!extension) return callback.call(context, message);

	      var fn = extension[stage];
	      if (!fn) return pipe(message);

	      if (fn.length >= 3) extension[stage](message, request, pipe);
	      else                extension[stage](message, pipe);
	    };
	    pipe(message);
	  }
	};

	Faye.extend(Faye_Extensible, Faye_Logging);

	module.exports = Faye_Extensible;


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye_Class = __webpack_require__(15);
	var Faye_Grammar = __webpack_require__(24);

	var Faye_Error = Faye_Class({
	  initialize: function(code, params, message) {
	    this.code    = code;
	    this.params  = Array.prototype.slice.call(params);
	    this.message = message;
	  },

	  toString: function() {
	    return this.code + ':' +
	           this.params.join(',') + ':' +
	           this.message;
	  }
	});

	Faye_Error.parse = function(message) {
	  message = message || '';
	  if (!Faye_Grammar.ERROR.test(message)) return new this(null, [], message);

	  var parts   = message.split(':'),
	      code    = parseInt(parts[0]),
	      params  = parts[1].split(','),
	      message = parts[2];

	  return new this(code, params, message);
	};

	// http://code.google.com/p/cometd/wiki/BayeuxCodes
	var errors = {
	  versionMismatch:  [300, 'Version mismatch'],
	  conntypeMismatch: [301, 'Connection types not supported'],
	  extMismatch:      [302, 'Extension mismatch'],
	  badRequest:       [400, 'Bad request'],
	  clientUnknown:    [401, 'Unknown client'],
	  parameterMissing: [402, 'Missing required parameter'],
	  channelForbidden: [403, 'Forbidden channel'],
	  channelUnknown:   [404, 'Unknown channel'],
	  channelInvalid:   [405, 'Invalid channel'],
	  extUnknown:       [406, 'Unknown extension'],
	  publishFailed:    [407, 'Failed to publish'],
	  serverError:      [500, 'Internal server error']
	};

	Object.keys(errors).forEach(function(name) {
	  var errorCode = errors[name][0];
	  var description = errors[name][1];

	  Faye_Error[name] = function() {
	    return new this(errorCode, arguments, description).toString();
	  };
	});

	module.exports = Faye_Error;


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);
	var Faye_Publisher = __webpack_require__(22);
	var Faye_Class = __webpack_require__(15);
	var Faye_Grammar = __webpack_require__(24);

	var Faye_Channel = Faye_Class({
	  initialize: function(name) {
	    this.id = this.name = name;
	  },

	  push: function(message) {
	    this.trigger('message', message);
	  },

	  isUnused: function() {
	    return this.countListeners('message') === 0;
	  }
	});

	Faye.extend(Faye_Channel.prototype, Faye_Publisher);

	Faye.extend(Faye_Channel, {
	  HANDSHAKE:    '/meta/handshake',
	  CONNECT:      '/meta/connect',
	  SUBSCRIBE:    '/meta/subscribe',
	  UNSUBSCRIBE:  '/meta/unsubscribe',
	  DISCONNECT:   '/meta/disconnect',

	  META:         'meta',
	  SERVICE:      'service',

	  expand: function(name) {
	    var segments = this.parse(name),
	        channels = ['/**', name];

	    var copy = segments.slice();
	    copy[copy.length - 1] = '*';
	    channels.push(this.unparse(copy));

	    for (var i = 1, n = segments.length; i < n; i++) {
	      copy = segments.slice(0, i);
	      copy.push('**');
	      channels.push(this.unparse(copy));
	    }

	    return channels;
	  },

	  isValid: function(name) {
	    return Faye_Grammar.CHANNEL_NAME.test(name) ||
	           Faye_Grammar.CHANNEL_PATTERN.test(name);
	  },

	  parse: function(name) {
	    if (!this.isValid(name)) return null;
	    return name.split('/').slice(1);
	  },

	  unparse: function(segments) {
	    return '/' + segments.join('/');
	  },

	  isMeta: function(name) {
	    var segments = this.parse(name);
	    return segments ? (segments[0] === this.META) : null;
	  },

	  isService: function(name) {
	    var segments = this.parse(name);
	    return segments ? (segments[0] === this.SERVICE) : null;
	  },

	  isSubscribable: function(name) {
	    if (!this.isValid(name)) return null;
	    return !this.isMeta(name) && !this.isService(name);
	  },

	  Set: Faye_Class({
	    initialize: function() {
	      this._channels = {};
	    },

	    getKeys: function() {
	      var keys = [];
	      for (var key in this._channels) keys.push(key);
	      return keys;
	    },

	    remove: function(name) {
	      delete this._channels[name];
	    },

	    hasSubscription: function(name) {
	      return this._channels.hasOwnProperty(name);
	    },

	    subscribe: function(names, callback, context) {
	      var name;
	      for (var i = 0, n = names.length; i < n; i++) {
	        name = names[i];
	        var channel = this._channels[name] = this._channels[name] || new Faye_Channel(name);
	        if (callback) channel.bind('message', callback, context);
	      }
	    },

	    unsubscribe: function(name, callback, context) {
	      var channel = this._channels[name];
	      if (!channel) return false;
	      channel.unbind('message', callback, context);

	      if (channel.isUnused()) {
	        this.remove(name);
	        return true;
	      } else {
	        return false;
	      }
	    },

	    distributeMessage: function(message) {
	      var channels = Faye_Channel.expand(message.channel);

	      for (var i = 0, n = channels.length; i < n; i++) {
	        var channel = this._channels[channels[i]];
	        if (channel) channel.trigger('message', message.data);
	      }
	    }
	  })
	});

	module.exports = Faye_Channel;


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);
	var Faye_Scheduler = __webpack_require__(25);
	var Faye_Class = __webpack_require__(15);
	var Faye_Transport = __webpack_require__(8);
	var Faye_Publisher = __webpack_require__(22);
	var Faye_Logging = __webpack_require__(21);
	var Faye_URI = __webpack_require__(16);


	var Faye_Dispatcher = Faye_Class({
	  MAX_REQUEST_SIZE: 2048,
	  DEFAULT_RETRY:    5,

	  UP:   1,
	  DOWN: 2,

	  initialize: function(client, endpoint, options) {
	    this._client     = client;
	    this.endpoint    = Faye_URI.parse(endpoint);
	    this._alternates = options.endpoints || {};

	    this.cookies    = Faye.Cookies && new Faye.Cookies.CookieJar();
	    this._disabled  = [];
	    this._envelopes = {};
	    this.headers    = {};
	    this.retry      = options.retry || this.DEFAULT_RETRY;
	    this.proxy      = options.proxy || {};
	    this._scheduler = options.scheduler || Faye_Scheduler;
	    this._state     = 0;
	    this.transports = {};

	    this.tls = options.tls || {};
	    this.tls.ca = this.tls.ca || options.ca;

	    for (var type in this._alternates)
	      this._alternates[type] = Faye_URI.parse(this._alternates[type]);

	    this.maxRequestSize = this.MAX_REQUEST_SIZE;
	  },

	  endpointFor: function(connectionType) {
	    return this._alternates[connectionType] || this.endpoint;
	  },

	  disable: function(feature) {
	    this._disabled.push(feature);
	  },

	  setHeader: function(name, value) {
	    this.headers[name] = value;
	  },

	  close: function() {
	    var transport = this._transport;
	    delete this._transport;
	    if (transport) transport.close();
	  },

	  getConnectionTypes: function() {
	    return Faye_Transport.getConnectionTypes();
	  },

	  selectTransport: function(transportTypes) {
	    Faye_Transport.get(this, transportTypes, this._disabled, function(transport) {
	      this.debug('Selected ? transport for ?', transport.connectionType, Faye_URI.stringify(transport.endpoint));

	      if (transport === this._transport) return;
	      if (this._transport) this._transport.close();

	      this._transport = transport;
	      this.connectionType = transport.connectionType;
	    }, this);
	  },

	  sendMessage: function(message, timeout, options) {
	    if (!this._transport) return;
	    options = options || {};

	    var id       = message.id,
	        attempts = options.attempts,
	        deadline = options.deadline && new Date().getTime() + (options.deadline * 1000),
	        envelope = this._envelopes[id],
	        scheduler;

	    if (!envelope) {
	      scheduler = new this._scheduler(message, {timeout: timeout, interval: this.retry, attempts: attempts, deadline: deadline});
	      envelope  = this._envelopes[id] = {message: message, scheduler: scheduler};
	    }

	    this._sendEnvelope(envelope);
	  },

	  _sendEnvelope: function(envelope) {
	    if (envelope.request || envelope.timer) return;

	    var message   = envelope.message,
	        scheduler = envelope.scheduler,
	        self      = this;

	    if (!scheduler.isDeliverable()) {
	      scheduler.abort();
	      delete this._envelopes[message.id];
	      return;
	    }

	    envelope.timer = Faye.ENV.setTimeout(function() {
	      self.handleError(message);
	    }, scheduler.getTimeout() * 1000);

	    scheduler.send();
	    envelope.request = this._transport.sendMessage(message);
	  },

	  handleResponse: function(reply) {
	    var envelope = this._envelopes[reply.id];

	    if (reply.successful !== undefined && envelope) {
	      envelope.scheduler.succeed();
	      delete this._envelopes[reply.id];
	      Faye.ENV.clearTimeout(envelope.timer);
	    }

	    this.trigger('message', reply);

	    if (this._state === this.UP) return;
	    this._state = this.UP;
	    this._client.trigger('transport:up');
	  },

	  handleError: function(message, immediate) {
	    var envelope = this._envelopes[message.id],
	        request  = envelope && envelope.request,
	        self     = this;

	    if (!request) return;

	    request.then(function(req) {
	      if (req && req.abort) req.abort();
	    });

	    var scheduler = envelope.scheduler;
	    scheduler.fail();

	    Faye.ENV.clearTimeout(envelope.timer);
	    envelope.request = envelope.timer = null;

	    if (immediate) {
	      this._sendEnvelope(envelope);
	    } else {
	      envelope.timer = Faye.ENV.setTimeout(function() {
	        envelope.timer = null;
	        self._sendEnvelope(envelope);
	      }, scheduler.getInterval() * 1000);
	    }

	    if (this._state === this.DOWN) return;
	    this._state = this.DOWN;
	    this._client.trigger('transport:down');
	  }
	});

	Faye.extend(Faye_Dispatcher.prototype, Faye_Publisher);
	Faye.extend(Faye_Dispatcher.prototype, Faye_Logging);


	module.exports = Faye_Dispatcher;


/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);
	var Faye_Class = __webpack_require__(15);
	var Faye_Deferrable = __webpack_require__(20);

	var Faye_Subscription = Faye_Class({
	  initialize: function(client, channels, callback, context) {
	    this._client    = client;
	    this._channels  = channels;
	    this._callback  = callback;
	    this._context     = context;
	    this._cancelled = false;
	  },

	  cancel: function() {
	    if (this._cancelled) return;
	    this._client.unsubscribe(this._channels, this._callback, this._context);
	    this._cancelled = true;
	  },

	  unsubscribe: function() {
	    this.cancel();
	  }
	});

	Faye.extend(Faye_Subscription.prototype, Faye_Deferrable);

	module.exports = Faye_Subscription;


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);
	var Faye_Class = __webpack_require__(15);
	var Faye_Deferrable = __webpack_require__(20);

	var Faye_Publication = Faye_Class(Faye_Deferrable);

	module.exports = Faye_Publication;


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);

	var Faye_Class = function(parent, methods) {
	  if (typeof parent !== 'function') {
	    methods = parent;
	    parent  = Object;
	  }

	  var klass = function() {
	    if (!this.initialize) return this;
	    return this.initialize.apply(this, arguments) || this;
	  };

	  var bridge = function() {};
	  bridge.prototype = parent.prototype;

	  klass.prototype = new bridge();
	  Faye.extend(klass.prototype, methods);

	  return klass;
	};

	module.exports = Faye_Class;


/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);

	var Faye_URI = {
	  isURI: function(uri) {
	    return uri && uri.protocol && uri.host && uri.path;
	  },

	  isSameOrigin: function(uri) {
	    var location = Faye.ENV.location;
	    return uri.protocol === location.protocol &&
	           uri.hostname === location.hostname &&
	           uri.port     === location.port;
	  },

	  parse: function(url) {
	    if (typeof url !== 'string') return url;
	    var uri = {}, parts, query, pairs, i, n, data;

	    var consume = function(name, pattern) {
	      url = url.replace(pattern, function(match) {
	        uri[name] = match;
	        return '';
	      });
	      uri[name] = uri[name] || '';
	    };

	    consume('protocol', /^[a-z]+\:/i);
	    consume('host',     /^\/\/[^\/\?#]+/);

	    if (!/^\//.test(url) && !uri.host)
	      url = Faye.ENV.location.pathname.replace(/[^\/]*$/, '') + url;

	    consume('pathname', /^[^\?#]*/);
	    consume('search',   /^\?[^#]*/);
	    consume('hash',     /^#.*/);

	    uri.protocol = uri.protocol || Faye.ENV.location.protocol;

	    if (uri.host) {
	      uri.host     = uri.host.substr(2);
	      parts        = uri.host.split(':');
	      uri.hostname = parts[0];
	      uri.port     = parts[1] || '';
	    } else {
	      uri.host     = Faye.ENV.location.host;
	      uri.hostname = Faye.ENV.location.hostname;
	      uri.port     = Faye.ENV.location.port;
	    }

	    uri.pathname = uri.pathname || '/';
	    uri.path = uri.pathname + uri.search;

	    query = uri.search.replace(/^\?/, '');
	    pairs = query ? query.split('&') : [];
	    data  = {};

	    for (i = 0, n = pairs.length; i < n; i++) {
	      parts = pairs[i].split('=');
	      data[decodeURIComponent(parts[0] || '')] = decodeURIComponent(parts[1] || '');
	    }

	    uri.query = data;

	    uri.href = this.stringify(uri);
	    return uri;
	  },

	  stringify: function(uri) {
	    var string = uri.protocol + '//' + uri.hostname;
	    if (uri.port) string += ':' + uri.port;
	    string += uri.pathname + this.queryString(uri.query) + (uri.hash || '');
	    return string;
	  },

	  queryString: function(query) {
	    var pairs = [];
	    for (var key in query) {
	      if (!query.hasOwnProperty(key)) continue;
	      pairs.push(encodeURIComponent(key) + '=' + encodeURIComponent(query[key]));
	    }
	    if (pairs.length === 0) return '';
	    return '?' + pairs.join('&');
	  }
	};

	module.exports = Faye_URI;


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	module.exports = (function() {

	var timeout = setTimeout, defer;

	if (typeof setImmediate === 'function')
	  defer = function(fn) { setImmediate(fn) };
	else if (typeof process === 'object' && process.nextTick)
	  defer = function(fn) { process.nextTick(fn) };
	else
	  defer = function(fn) { timeout(fn, 0) };

	var PENDING   = 0,
	    FULFILLED = 1,
	    REJECTED  = 2;

	var RETURN = function(x) { return x },
	    THROW  = function(x) { throw  x };

	var Promise = function(task) {
	  this._state       = PENDING;
	  this._onFulfilled = [];
	  this._onRejected  = [];

	  if (typeof task !== 'function') return;
	  var self = this;

	  task(function(value)  { fulfill(self, value) },
	       function(reason) { reject(self, reason) });
	};

	Promise.prototype.then = function(onFulfilled, onRejected) {
	  var next = new Promise();
	  registerOnFulfilled(this, onFulfilled, next);
	  registerOnRejected(this, onRejected, next);
	  return next;
	};

	var registerOnFulfilled = function(promise, onFulfilled, next) {
	  if (typeof onFulfilled !== 'function') onFulfilled = RETURN;
	  var handler = function(value) { invoke(onFulfilled, value, next) };

	  if (promise._state === PENDING) {
	    promise._onFulfilled.push(handler);
	  } else if (promise._state === FULFILLED) {
	    handler(promise._value);
	  }
	};

	var registerOnRejected = function(promise, onRejected, next) {
	  if (typeof onRejected !== 'function') onRejected = THROW;
	  var handler = function(reason) { invoke(onRejected, reason, next) };

	  if (promise._state === PENDING) {
	    promise._onRejected.push(handler);
	  } else if (promise._state === REJECTED) {
	    handler(promise._reason);
	  }
	};

	var invoke = function(fn, value, next) {
	  defer(function() { _invoke(fn, value, next) });
	};

	var _invoke = function(fn, value, next) {
	  var outcome;

	  try {
	    outcome = fn(value);
	  } catch (error) {
	    return reject(next, error);
	  }

	  if (outcome === next) {
	    reject(next, new TypeError('Recursive promise chain detected'));
	  } else {
	    fulfill(next, outcome);
	  }
	};

	var fulfill = Promise.fulfill = Promise.resolve = function(promise, value) {
	  var called = false, type, then;

	  try {
	    type = typeof value;
	    then = value !== null && (type === 'function' || type === 'object') && value.then;

	    if (typeof then !== 'function') return _fulfill(promise, value);

	    then.call(value, function(v) {
	      if (!(called ^ (called = true))) return;
	      fulfill(promise, v);
	    }, function(r) {
	      if (!(called ^ (called = true))) return;
	      reject(promise, r);
	    });
	  } catch (error) {
	    if (!(called ^ (called = true))) return;
	    reject(promise, error);
	  }
	};

	var _fulfill = function(promise, value) {
	  if (promise._state !== PENDING) return;

	  promise._state      = FULFILLED;
	  promise._value      = value;
	  promise._onRejected = [];

	  var onFulfilled = promise._onFulfilled, fn;
	  while (fn = onFulfilled.shift()) fn(value);
	};

	var reject = Promise.reject = function(promise, reason) {
	  if (promise._state !== PENDING) return;

	  promise._state       = REJECTED;
	  promise._reason      = reason;
	  promise._onFulfilled = [];

	  var onRejected = promise._onRejected, fn;
	  while (fn = onRejected.shift()) fn(reason);
	};

	Promise.all = function(promises) {
	  return new Promise(function(fulfill, reject) {
	    var list = [],
	         n   = promises.length,
	         i;

	    if (n === 0) return fulfill(list);

	    for (i = 0; i < n; i++) (function(promise, i) {
	      Promise.fulfilled(promise).then(function(value) {
	        list[i] = value;
	        if (--n === 0) fulfill(list);
	      }, reject);
	    })(promises[i], i);
	  });
	};

	Promise.defer = defer;

	Promise.deferred = Promise.pending = function() {
	  var tuple = {};

	  tuple.promise = new Promise(function(fulfill, reject) {
	    tuple.fulfill = tuple.resolve = fulfill;
	    tuple.reject  = reject;
	  });
	  return tuple;
	};

	Promise.fulfilled = Promise.resolved = function(value) {
	  return new Promise(function(fulfill, reject) { fulfill(value) });
	};

	Promise.rejected = function(reason) {
	  return new Promise(function(fulfill, reject) { reject(reason) });
	};

	return Promise;

	})();
	
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(27)))

/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye_Class = __webpack_require__(15);

	var Faye_Set = Faye_Class({
	  initialize: function() {
	    this._index = {};
	  },

	  add: function(item) {
	    var key = (item.id !== undefined) ? item.id : item;
	    if (this._index.hasOwnProperty(key)) return false;
	    this._index[key] = item;
	    return true;
	  },

	  forEach: function(block, context) {
	    for (var key in this._index) {
	      if (this._index.hasOwnProperty(key))
	        block.call(context, this._index[key]);
	    }
	  },

	  isEmpty: function() {
	    for (var key in this._index) {
	      if (this._index.hasOwnProperty(key)) return false;
	    }
	    return true;
	  },

	  member: function(item) {
	    for (var key in this._index) {
	      if (this._index[key] === item) return true;
	    }
	    return false;
	  },

	  remove: function(item) {
	    var key = (item.id !== undefined) ? item.id : item;
	    var removed = this._index[key];
	    delete this._index[key];
	    return removed;
	  },

	  toArray: function() {
	    var array = [];
	    this.forEach(function(item) { array.push(item) });
	    return array;
	  }
	});

	module.exports = Faye_Set;


/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);

	var Faye_Event = {
	  _registry: [],

	  on: function(element, eventName, callback, context) {
	    var wrapped = function() { callback.call(context) };

	    if (element.addEventListener)
	      element.addEventListener(eventName, wrapped, false);
	    else
	      element.attachEvent('on' + eventName, wrapped);

	    this._registry.push({
	      _element:   element,
	      _type:      eventName,
	      _callback:  callback,
	      _context:     context,
	      _handler:   wrapped
	    });
	  },

	  detach: function(element, eventName, callback, context) {
	    var i = this._registry.length, register;
	    while (i--) {
	      register = this._registry[i];

	      if ((element    && element    !== register._element)   ||
	          (eventName  && eventName  !== register._type)      ||
	          (callback   && callback   !== register._callback)  ||
	          (context      && context      !== register._context))
	        continue;

	      if (register._element.removeEventListener)
	        register._element.removeEventListener(register._type, register._handler, false);
	      else
	        register._element.detachEvent('on' + register._type, register._handler);

	      this._registry.splice(i,1);
	      register = null;
	    }
	  }
	};

	if (Faye.ENV.onunload !== undefined) Faye_Event.on(Faye.ENV, 'unload', Faye_Event.detach, Faye_Event);

	module.exports = Faye_Event;


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye_Promise = __webpack_require__(17);
	var Faye = __webpack_require__(7);

	var Faye_Deferrable = {
	  then: function(callback, errback) {
	    var self = this;
	    if (!this._promise)
	      this._promise = new Faye_Promise(function(fulfill, reject) {
	        self._fulfill = fulfill;
	        self._reject  = reject;
	      });

	    if (arguments.length === 0)
	      return this._promise;
	    else
	      return this._promise.then(callback, errback);
	  },

	  callback: function(callback, context) {
	    return this.then(function(value) { callback.call(context, value) });
	  },

	  errback: function(callback, context) {
	    return this.then(null, function(reason) { callback.call(context, reason) });
	  },

	  timeout: function(seconds, message) {
	    this.then();
	    var self = this;
	    this._timer = Faye.ENV.setTimeout(function() {
	      self._reject(message);
	    }, seconds * 1000);
	  },

	  setDeferredStatus: function(status, value) {
	    if (this._timer) Faye.ENV.clearTimeout(this._timer);

	    this.then();

	    if (status === 'succeeded')
	      this._fulfill(value);
	    else if (status === 'failed')
	      this._reject(value);
	    else
	      delete this._promise;
	  }
	};

	module.exports = Faye_Deferrable;


/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);

	var Faye_Logging = {
	  LOG_LEVELS: {
	    fatal:  4,
	    error:  3,
	    warn:   2,
	    info:   1,
	    debug:  0
	  },

	  writeLog: function(messageArgs, level) {
	    if (!Faye.logger) return;

	    var args   = Array.prototype.slice.apply(messageArgs),
	        banner = '[Faye',
	        klass  = this.className,

	        message = args.shift().replace(/\?/g, function() {
	          try {
	            return Faye.toJSON(args.shift());
	          } catch (e) {
	            return '[Object]';
	          }
	        });

	    for (var key in Faye) {
	      if (klass) continue;
	      if (typeof Faye[key] !== 'function') continue;
	      if (this instanceof Faye[key]) klass = key;
	    }
	    if (klass) banner += '.' + klass;
	    banner += '] ';

	    if (typeof Faye.logger[level] === 'function')
	      Faye.logger[level](banner + message);
	    else if (typeof Faye.logger === 'function')
	      Faye.logger(banner + message);
	  }
	};

	(function() {
	  for (var key in Faye_Logging.LOG_LEVELS)
	    (function(level) {
	      Faye_Logging[level] = function() {
	        this.writeLog(arguments, level);
	      };
	    })(key);
	})();

	module.exports = Faye_Logging;


/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);
	var Faye_EventEmitter = __webpack_require__(26);

	var Faye_Publisher = {
	  countListeners: function(eventType) {
	    return this.listeners(eventType).length;
	  },

	  bind: function(eventType, listener, context) {
	    var slice   = Array.prototype.slice,
	        handler = function() { listener.apply(context, slice.call(arguments)) };

	    this._listeners = this._listeners || [];
	    this._listeners.push([eventType, listener, context, handler]);
	    return this.on(eventType, handler);
	  },

	  unbind: function(eventType, listener, context) {
	    this._listeners = this._listeners || [];
	    var n = this._listeners.length, tuple;

	    while (n--) {
	      tuple = this._listeners[n];
	      if (tuple[0] !== eventType) continue;
	      if (listener && (tuple[1] !== listener || tuple[2] !== context)) continue;
	      this._listeners.splice(n, 1);
	      this.removeListener(eventType, tuple[3]);
	    }
	  }
	};

	Faye.extend(Faye_Publisher, Faye_EventEmitter.prototype);
	Faye_Publisher.trigger = Faye_Publisher.emit;

	module.exports = Faye_Publisher;


/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);

	var Faye_Timeouts = {
	  addTimeout: function(name, delay, callback, context) {
	    this._timeouts = this._timeouts || {};
	    if (this._timeouts.hasOwnProperty(name)) return;
	    var self = this;
	    this._timeouts[name] = Faye.ENV.setTimeout(function() {
	      delete self._timeouts[name];
	      callback.call(context);
	    }, 1000 * delay);
	  },

	  removeTimeout: function(name) {
	    this._timeouts = this._timeouts || {};
	    var timeout = this._timeouts[name];
	    if (!timeout) return;
	    Faye.ENV.clearTimeout(timeout);
	    delete this._timeouts[name];
	  },

	  removeAllTimeouts: function() {
	    this._timeouts = this._timeouts || {};
	    for (var name in this._timeouts) this.removeTimeout(name);
	  }
	};

	module.exports = Faye_Timeouts;


/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);

	var Faye_Grammar = {
	  CHANNEL_NAME:     /^\/(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+(\/(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+)*$/,
	  CHANNEL_PATTERN:  /^(\/(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+)*\/\*{1,2}$/,
	  ERROR:            /^([0-9][0-9][0-9]:(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*(,(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*)*:(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*|[0-9][0-9][0-9]::(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*)$/,
	  VERSION:          /^([0-9])+(\.(([a-z]|[A-Z])|[0-9])(((([a-z]|[A-Z])|[0-9])|\-|\_))*)*$/
	};

	module.exports = Faye_Grammar;


/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);

	var Faye_Scheduler = function(message, options) {
	  this.message  = message;
	  this.options  = options;
	  this.attempts = 0;
	};

	Faye.extend(Faye_Scheduler.prototype, {
	  getTimeout: function() {
	    return this.options.timeout;
	  },

	  getInterval: function() {
	    return this.options.interval;
	  },

	  isDeliverable: function() {
	    var attempts = this.options.attempts,
	        made     = this.attempts,
	        deadline = this.options.deadline,
	        now      = new Date().getTime();

	    if (attempts !== undefined && made >= attempts)
	      return false;

	    if (deadline !== undefined && now > deadline)
	      return false;

	    return true;
	  },

	  send: function() {
	    this.attempts += 1;
	  },

	  succeed: function() {},

	  fail: function() {},

	  abort: function() {}
	});

	module.exports = Faye_Scheduler;


/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = (function() {
	var EventEmitter = function() {};

	/*
	Copyright Joyent, Inc. and other Node contributors. All rights reserved.
	Permission is hereby granted, free of charge, to any person obtaining a copy of
	this software and associated documentation files (the "Software"), to deal in
	the Software without restriction, including without limitation the rights to
	use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
	of the Software, and to permit persons to whom the Software is furnished to do
	so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
	*/

	var isArray = typeof Array.isArray === 'function'
	    ? Array.isArray
	    : function (xs) {
	        return Object.prototype.toString.call(xs) === '[object Array]'
	    }
	;
	function indexOf (xs, x) {
	    if (xs.indexOf) return xs.indexOf(x);
	    for (var i = 0; i < xs.length; i++) {
	        if (x === xs[i]) return i;
	    }
	    return -1;
	}


	EventEmitter.prototype.emit = function(type) {
	  // If there is no 'error' event listener then throw.
	  if (type === 'error') {
	    if (!this._events || !this._events.error ||
	        (isArray(this._events.error) && !this._events.error.length))
	    {
	      if (arguments[1] instanceof Error) {
	        throw arguments[1]; // Unhandled 'error' event
	      } else {
	        throw new Error("Uncaught, unspecified 'error' event.");
	      }
	      return false;
	    }
	  }

	  if (!this._events) return false;
	  var handler = this._events[type];
	  if (!handler) return false;

	  if (typeof handler == 'function') {
	    switch (arguments.length) {
	      // fast cases
	      case 1:
	        handler.call(this);
	        break;
	      case 2:
	        handler.call(this, arguments[1]);
	        break;
	      case 3:
	        handler.call(this, arguments[1], arguments[2]);
	        break;
	      // slower
	      default:
	        var args = Array.prototype.slice.call(arguments, 1);
	        handler.apply(this, args);
	    }
	    return true;

	  } else if (isArray(handler)) {
	    var args = Array.prototype.slice.call(arguments, 1);

	    var listeners = handler.slice();
	    for (var i = 0, l = listeners.length; i < l; i++) {
	      listeners[i].apply(this, args);
	    }
	    return true;

	  } else {
	    return false;
	  }
	};

	// EventEmitter is defined in src/node_events.cc
	// EventEmitter.prototype.emit() is also defined there.
	EventEmitter.prototype.addListener = function(type, listener) {
	  if ('function' !== typeof listener) {
	    throw new Error('addListener only takes instances of Function');
	  }

	  if (!this._events) this._events = {};

	  // To avoid recursion in the case that type == "newListeners"! Before
	  // adding it to the listeners, first emit "newListeners".
	  this.emit('newListener', type, listener);

	  if (!this._events[type]) {
	    // Optimize the case of one listener. Don't need the extra array object.
	    this._events[type] = listener;
	  } else if (isArray(this._events[type])) {
	    // If we've already got an array, just append.
	    this._events[type].push(listener);
	  } else {
	    // Adding the second element, need to change to array.
	    this._events[type] = [this._events[type], listener];
	  }

	  return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function(type, listener) {
	  var self = this;
	  self.on(type, function g() {
	    self.removeListener(type, g);
	    listener.apply(this, arguments);
	  });

	  return this;
	};

	EventEmitter.prototype.removeListener = function(type, listener) {
	  if ('function' !== typeof listener) {
	    throw new Error('removeListener only takes instances of Function');
	  }

	  // does not use listeners(), so no side effect of creating _events[type]
	  if (!this._events || !this._events[type]) return this;

	  var list = this._events[type];

	  if (isArray(list)) {
	    var i = indexOf(list, listener);
	    if (i < 0) return this;
	    list.splice(i, 1);
	    if (list.length == 0)
	      delete this._events[type];
	  } else if (this._events[type] === listener) {
	    delete this._events[type];
	  }

	  return this;
	};

	EventEmitter.prototype.removeAllListeners = function(type) {
	  if (arguments.length === 0) {
	    this._events = {};
	    return this;
	  }

	  // does not use listeners(), so no side effect of creating _events[type]
	  if (type && this._events && this._events[type]) this._events[type] = null;
	  return this;
	};

	EventEmitter.prototype.listeners = function(type) {
	  if (!this._events) this._events = {};
	  if (!this._events[type]) this._events[type] = [];
	  if (!isArray(this._events[type])) {
	    this._events[type] = [this._events[type]];
	  }
	  return this._events[type];
	};

	return EventEmitter;

	})();


/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	// shim for using process in browser

	var process = module.exports = {};

	process.nextTick = (function () {
	    var canSetImmediate = typeof window !== 'undefined'
	    && window.setImmediate;
	    var canPost = typeof window !== 'undefined'
	    && window.postMessage && window.addEventListener
	    ;

	    if (canSetImmediate) {
	        return function (f) { return window.setImmediate(f) };
	    }

	    if (canPost) {
	        var queue = [];
	        window.addEventListener('message', function (ev) {
	            var source = ev.source;
	            if ((source === window || source === null) && ev.data === 'process-tick') {
	                ev.stopPropagation();
	                if (queue.length > 0) {
	                    var fn = queue.shift();
	                    fn();
	                }
	            }
	        }, true);

	        return function nextTick(fn) {
	            queue.push(fn);
	            window.postMessage('process-tick', '*');
	        };
	    }

	    return function nextTick(fn) {
	        setTimeout(fn, 0);
	    };
	})();

	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	}

	// TODO(shtylman)
	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};


/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);
	var Faye_Class = __webpack_require__(15);
	var Faye_Transport = __webpack_require__(8);
	var Faye_Event = __webpack_require__(19);
	var Faye_URI = __webpack_require__(16);
	var Faye_Promise = __webpack_require__(17);
	var Faye_Deferrable = __webpack_require__(20);
	var Faye_Set = __webpack_require__(18);
	var Faye_Logging = __webpack_require__(21);
	var Faye_FSM = __webpack_require__(29);

	function delay(ms) {
	  return new Faye_Promise(function(resolve) {
	    setTimeout(resolve, ms);
	  });
	}

	var FSM = {
	  initial: "NEVER_CONNECTED",
	  transitions: {
	    NEVER_CONNECTED: {
	      connect: "CONNECTING_INITIAL"
	    },
	    CONNECTING_INITIAL: {
	      socketClosed: "CLOSED",
	      socketConnected: "CONNECTED",
	      close: "CLOSED"
	    },
	    CONNECTING: {
	      socketClosed: "AWAITING_RETRY",
	      socketConnected: "CONNECTED",
	      close: "CLOSED"
	    },
	    CONNECTED: {
	      socketClosed: "AWAITING_RETRY",
	      pingTimeout: "RECONNECTING",
	      close: "CLOSED"
	    },
	    AWAITING_RETRY: {
	      close: "CLOSED",
	      connect: "RECONNECTING"
	    },
	    RECONNECTING: {
	      socketClosed: "AWAITING_RETRY",
	      socketConnected: "CONNECTED",
	      close: "CLOSED"
	    },
	    CLOSED: {
	      connect: "CONNECTING"
	    },
	  }
	};


	var connection = Faye.ENV.navigator.connection || Faye.ENV.navigator.mozConnection || Faye.ENV.navigator.webkitConnection;

	var count = 0;
	var Socket_Promise = Faye_Class({

	  initialize: function(socket, transport) {
	    count++;
	    console.log('open COUNT IS ', count);
	    if(count > 10) throw new Error('BUST');

	    var self = this;
	    this._socket = socket;
	    this._transport = transport;

	    this._socketPromise = new Faye_Promise(function(resolve, reject) {

	      switch (socket.readyState) {
	        case socket.OPEN:
	          resolve(self);
	          break;

	        case socket.CONNECTING:
	          // Timeout if the connection doesn't become established
	          var connectTimeout = setTimeout(function() {
	            console.error('Timeout while waiting for connection to establish');
	            reject(new Error('Timeout on connection'));
	          }, transport._dispatcher.timeout * 1000 / 4);

	          socket.onopen = function() {
	            clearTimeout(connectTimeout);
	            console.info(new Date(), 'Websocket socket opened successfully');
	            resolve(self);
	          };
	          break;

	        case socket.CLOSING:
	        case socket.CLOSED:
	          reject(new Error('Socket connection failed'));
	          return;
	      }

	      socket.onmessage = function(e) {
	        console.info(new Date(), 'new message');
	        self._transport._onmessage(self, e);
	      };

	      socket.onclose = socket.onerror = function(e) {
	        socket.onclose = socket.onerror = null;

	        console.error(new Date(), 'ONCLOSE/ONERROR', e);
	        reject(new Error("Connection failed"));
	        self.failed();
	      };

	    }).then(function() {
	      self._setup = true;
	    }, function(err) {
	      console.error('Connection failed', err);
	      self.failed();
	      throw err;
	    });
	  },

	  failed: function() {
	    if(!this._socket) return;
	    var socket = this._socket;
	    this._socket = null;

	    count--;
	    console.log('close COUNT IS ', count);

	    this._socketPromise = new Faye_Promise.rejected(new Error('Connection closed'));
	    if(this._setup) {
	      this._transport._socketClosed(this);
	    }

	    var state = socket.readyState;

	    if(state === socket.OPEN || state === socket.CONNECTING) {
	      socket.onerror = socket.onclose = null;
	      socket.close();
	    }

	  },

	  connected: function() {
	    return this._socketPromise;
	  },

	  send: function(messages) {
	    var self = this;
	    return this._socketPromise
	      .then(function() {
	        var socket = self._socket;

	        // Todo: deal with a timeout situation...
	        if(socket.readyState !== socket.OPEN) {
	          throw new Error('Socket is not open');
	        }

	        socket.send(Faye.toJSON(messages));
	      });
	  },

	  close: function() {
	    this.failed();
	  }

	});
	Faye.extend(Socket_Promise.prototype, Faye_Logging);

	var Faye_Transport_WebSocket = Faye.extend(Faye_Class(Faye_Transport, {
	  batching:     false,
	  initialize: function(dispatcher, endpoint) {
	    Faye_Transport.prototype.initialize.call(this, dispatcher, endpoint);

	    this._state = new Faye_FSM(FSM);
	    this._state.on('enter:CONNECTING', this._onEnterConnecting.bind(this));
	    this._state.on('enter:RECONNECTING', this._onEnterConnecting.bind(this));
	    this._state.on('enter:CONNECTING_INITIAL', this._onEnterConnecting.bind(this));
	    this._state.on('enter:AWAITING_RETRY', this._onEnterAwaitingRetry.bind(this));
	    this._state.on('enter:CONNECTED', this._onEnterConnected.bind(this));
	    this._state.on('leave:CONNECTED', this._onLeaveConnected.bind(this));
	  },

	  isUsable: function(callback, context) {
	    return this.connect()
	      .then(function() {
	        callback.call(context, true);
	      }, function(err) {
	        callback.call(context, false);
	      });
	  },

	  request: function(messages) {
	    var self = this;
	    var aborted = false;

	    // Add all messages to the pending queue
	    if (!this._pending) this._pending = new Faye_Set();
	    for (var i = 0, n = messages.length; i < n; i++) this._pending.add(messages[i]);

	    this.connect()
	      .then(function() {
	        if (aborted) {
	          throw new Error("Send aborted");
	        }

	        return self._socket.send(messages);
	      });

	    return {
	      abort: function() {
	        console.log('ABORTING', messages);
	        /* If the message has not already been sent, abort the send */
	        aborted = true;
	      }
	    };
	  },

	  connect: function() {
	    if(this._state.stateIs('CLOSED', 'NEVER_CONNECTED')) {
	      this._state.transition('connect');
	    }

	    return this._state.waitFor({
	      fulfilled: 'CONNECTED',
	      rejected: 'CLOSED',
	      timeout: this._dispatcher.timeout * 1000 / 2
	    });
	  },

	  _onEnterConnecting: function() {
	    console.info('_onEnterConnecting');

	    var self = this;

	    if (Faye_Transport_WebSocket._unloaded) {
	      self._state.transition('socketClosed', new Error('Sockets unloading'));
	      return;
	    }

	    var url     = Faye_Transport_WebSocket.getSocketUrl(self.endpoint),
	        headers = Faye.copyObject(self._dispatcher.headers),
	        options = { headers: headers, ca: self._dispatcher.ca },
	        socket;

	    options.headers.Cookie = self._getCookies();

	    // if (Faye.WebSocket)        socket = new Faye.WebSocket.Client(url, [], options);
	    if (Faye.ENV.MozWebSocket) socket = new Faye.ENV.MozWebSocket(url);
	    if (Faye.ENV.WebSocket)    socket = new Faye.ENV.WebSocket(url);

	    if (!socket) {
	      self._state.transition('socketClosed', new Error('Sockets not supported'));
	      return;
	    }

	    self._socket = new Socket_Promise(socket, self);
	    self._socket.connected()
	      .then(function(socket) {
	        console.log('CONNECTED');
	        self._state.transition('socketConnected');
	      }, function(err) {
	        console.error('SOCKET FAILED TO CONNECT', err);
	        self._state.transition('socketClosed', err);
	      });
	  },

	  _onEnterAwaitingRetry: function() {
	    var self = this;
	    setTimeout(function() {
	      if(self._state.stateIs('AWAITING_RETRY')) {
	        console.log(new Date(), 'Retrying connection now');
	        self._state.transition('connect');
	      }
	    }, this._dispatcher.retry * 1000 || 1000);
	  },

	  _onEnterConnected: function(lastState) {
	    var self = this;

	    this.addTimeout('ping', this._dispatcher.timeout / 2, this._ping, this);
	    if(!this._onNetworkEventBound) {
	      this._onNetworkEventBound = this._onNetworkEvent.bind(this);
	    }

	    if (connection) {
	      connection.addEventListener('typechange', this._onNetworkEventBound, false);
	    }

	    if (Faye.ENV.addEventListener) {
	      connection.addEventListener('online', this._onNetworkEventBound, false);
	      connection.addEventListener('offline', this._onNetworkEventBound, false);
	    }

	    this._sleepDetectionLast = Date.now();
	    this._sleepDetectionTimer = setInterval(function() {
	      var now = Date.now();
	      if(self._sleepDetectionLast - now > 60000) {
	        console.log('SLEEP DETECTED!');
	        self._ping();
	      }
	      self._sleepDetectionLast = now;
	    }, 30000);

	    if(lastState === 'RECONNECTING') {
	      setTimeout(function() {
	        console.info('RESENING connection ');
	        self._dispatcher._client.connect(function() {
	          console.log('CONNECT on reconnect got back', arguments);
	        }, self);

	      }, 0);
	    }
	  },

	  _onLeaveConnected: function() {
	    var socket = this._socket;
	    if(socket) {
	      this._socket = null;
	      socket.close();
	    }
	    this.removeTimeout('ping');
	    this.removeTimeout('pingTimeout');

	    if(connection) {
	      connection.removeEventListener('typechange', this._onNetworkEventBound, false);
	    }

	    if (Faye.ENV.removeEventListener) {
	      connection.removeEventListener('online', this._onNetworkEventBound, false);
	      connection.removeEventListener('offline', this._onNetworkEventBound, false);
	    }

	    clearTimeout(this._sleepDetectionTimer);

	    this._rejectPending();
	  },

	  close: function() {
	    console.error('CLOSE CALLED')
	    this._state.transitionIfPossible('close');
	  },

	  _rejectPending: function() {
	    var pending = this._pending ? this._pending.toArray() : [];
	    delete this._pending;

	    console.log('REJECTING', pending);

	    this._handleError(pending);
	  },

	  _onNetworkEvent: function(e) {
	    console.log('NETWORK EVENT', e);
	    if(this._state.stateIs('CONNECTED')) {
	      this._ping();
	    } else if(this._state.stateIs('AWAITING_RETRY')) {
	      this._state.transition('connect');
	    }
	  },

	  _onmessage: function(socket, e) {
	    // Don't ignore messages from orphans
	    console.debug(new Date(), 'Websocket message received');
	    var replies = JSON.parse(e.data);
	    if (!replies) return;

	    replies = [].concat(replies);

	    if(this._socket === socket) {
	      this.removeTimeout('pingTimeout');
	      this.removeTimeout('ping');
	      this.addTimeout('ping', this._dispatcher.timeout / 2, this._ping, this);
	    } else {
	      console.error('message received from socket', socket, 'expected', this._socket);
	    }

	    for (var i = 0, n = replies.length; i < n; i++) {
	      if (replies[i].successful !== undefined) {
	        this._pending.remove(replies[i]);
	      }
	    }
	    this._receive(replies);
	  },

	  _socketClosed: function(socket) {
	    console.warn('socket closed: ', socket);
	    if(this._socket === socket) {
	      this._state.transitionIfPossible('socketClosed');
	    } else {
	      console.warn('ignoring socket closed: ', socket);
	    }

	  },

	  _ping: function() {
	    console.info('PING');
	    this.removeTimeout('ping');
	    this.addTimeout('pingTimeout', this._dispatcher.timeout / 4, this._pingTimeout, this);
	    this._socket.send([]);
	  },

	  _pingTimeout: function() {
	    this._state.transitionIfPossible('pingTimeout');
	  }

	}), {

	  PROTOCOLS: {
	    'http:':  'ws:',
	    'https:': 'wss:'
	  },

	  create: function(dispatcher, endpoint) {
	    var sockets = dispatcher.transports.websocket;
	    if(!sockets) {
	      sockets = {};
	      dispatcher.transports.websocket = sockets;
	    }

	    if(sockets[endpoint.href]) {
	      return sockets[endpoint.href];
	    }

	    var socket =  new Faye_Transport_WebSocket(dispatcher, endpoint);
	    sockets[endpoint.href] = socket;
	    return socket;
	  },

	  getSocketUrl: function(endpoint) {
	    endpoint = Faye.copyObject(endpoint);
	    endpoint.protocol = this.PROTOCOLS[endpoint.protocol];
	    return Faye_URI.stringify(endpoint);
	  },

	  isUsable: function(dispatcher, endpoint, callback, context) {
	    this.create(dispatcher, endpoint).isUsable(callback, context);
	  }

	});

	Faye.extend(Faye_Transport_WebSocket.prototype, Faye_Deferrable);
	Faye_Transport.register('websocket', Faye_Transport_WebSocket);

	if (Faye_Event && Faye.ENV.onbeforeunload !== undefined)
	  Faye_Event.on(Faye.ENV, 'beforeunload', function() {
	    Faye_Transport_WebSocket._unloaded = true;
	  });

	module.exports = Faye_Transport;


/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Faye = __webpack_require__(7);
	var Faye_Class = __webpack_require__(15);
	var Faye_EventEmitter = __webpack_require__(26);
	var Faye_Promise = __webpack_require__(17);

	var Faye_FSM = Faye_Class({
	  initialize: function(config) {
	    this._config = config;
	    this._state = config.initial;
	    this._transitionQueue = [];
	  },

	  getState: function() {
	    return this._state;
	  },

	  stateIs: function() {
	    for(var i = 0; i < arguments.length; i++) {
	      if(this._state === arguments[i]) return true;
	    }

	    return false;
	  },

	  transition: function(transition) {
	    this._queueTransition(transition);
	  },

	  _queueTransition: function(transition, optional) {
	    this._transitionQueue.push({ transition: transition, optional: optional });

	    if(this._transitionQueue.length == 1) {
	      this._dequeueTransition();
	    }
	  },

	  _dequeueTransition: function() {
	    var transitionDetails = this._transitionQueue.shift();
	    if(!transitionDetails) return;

	    var transition = transitionDetails.transition;
	    var optional = transitionDetails.optional;

	    try {
	      var transitions = this._config.transitions;
	      var newState = transitions[this._state] && transitions[this._state][transition];

	      if (!newState) {
	        if(!optional) {
	          this.emit('error', new Error('Unable to perform transition ' + transition + ' from state ' + this._state));
	        }

	        return;
	      }

	      if (newState === this._state) return;

	      console.log('TRANSITION: ', this._state, '=>', transition, '=>', newState);

	      this.emit('transition', transition, this._state, newState);
	      this.emit('leave:' + this._state, newState);

	      var oldState = this._state;
	      this._state = newState;

	      this.emit('enter:' + this._state, oldState);
	    } catch(e) {
	      this.emit('error', e);
	    } finally {
	      var self = this;
	      this._transitionQueue.shift();

	      if(this._transitionQueue.length) {
	        setTimeout(function() {
	          console.info('DEQUEING next transition');
	          self._dequeueTransition();
	        }, 0);
	      }
	    }
	  },

	  transitionIfPossible: function(transition) {
	    this._queueTransition(transition, true);
	  },

	  waitFor: function(options) {
	    var self = this;

	    if(this._state === options.fulfilled) return Faye_Promise.resolved();
	    if(this._state === options.rejected) return Faye_Promise.rejected();

	    return new Faye_Promise(function(resolve, reject) {
	      var timeoutId;
	      var fulfilled = options.fulfilled;
	      var rejected = options.rejected;

	      var listener = function(transition, oldState, newState) {
	        console.log('>>>', transition, oldState, newState);
	        console.log('options.fulfilled', options.fulfilled);
	        console.log('options.rejected', options.rejected);

	        console.log('if', newState === options.fulfilled || newState === options.rejected);

	        if(newState === options.fulfilled || newState === options.rejected) {
	          this.removeListener('transition', listener);
	          clearTimeout(timeoutId);

	          if(newState === options.fulfilled) {
	            console.log('RESOLVED');
	            resolve();
	          } else {
	            console.log('REJECTED');
	            reject(new Error('State is ' + newState));
	          }
	        }

	      }.bind(self);

	      if(options.timeout) {
	        timeoutId = setTimeout(function() {
	          self.removeListener('transition', listener);
	          reject(new Error('Timeout waiting for ' + fulfilled));
	        }, options.timeout);
	      }

	      self.on('transition', listener);
	    });
	  }


	});
	Faye.extend(Faye_FSM.prototype, Faye_EventEmitter.prototype);

	module.exports = Faye_FSM;


/***/ }
/******/ ])
});
