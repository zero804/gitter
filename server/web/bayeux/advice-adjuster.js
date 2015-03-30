'use strict';

var env     = require('../../utils/env');
var config  = env.config;

function AdviceAdjuster() {
  this.processingTimeStats = [];
  this.precalculatedProcessingTimeAvg = -1;
}

AdviceAdjuster.prototype = {

  /**
   * Add a stats data point
   */
  _pushProcessingTime: function(duration) {
    /* Ignore fast requests */
    if (duration < 30) return;

    this.precalculatedProcessingTimeAvg = -1;
    this.processingTimeStats.push(duration);

    // Only keep the last 100 values others oom
    while (this.processingTimeStats.length > 100) {
      this.processingTimeStats.unshift();
    }
  },

  /**
   * Returns the value that should be used for faye timeouts
   */
   getFayeTimeout: function() {
    var fayeTimeout = config.get('ws:fayeTimeout');
    var subscribeTimeoutThreshold = config.get('ws:subscribeTimeoutThreshold');
    var additional = Math.max(0, this.avgProcessingTime() - subscribeTimeoutThreshold) * 1.6;
    return fayeTimeout + Math.round(additional / 1000);
  },

  /**
   * Returns the value that should be used for faye intervals.
   * This should gradually go up, but not as fast as the avg subscribe
   */
   getFayeInterval: function() {
    var fayeInterval = config.get('ws:fayeInterval');
    var subscribeTimeoutThreshold =  config.get('ws:subscribeTimeoutThreshold');

    var additional = Math.max(0, this.avgProcessingTime() - subscribeTimeoutThreshold) / 2.5;
    return fayeInterval + Math.round(additional / 1000);
  },

  /**
   * Return the average amount of time slow subscriptions are taking
   */
   avgProcessingTime: function() {
    if (this.precalculatedProcessingTimeAvg > 0) return this.precalculatedProcessingTimeAvg;

    // Only start attempting to figure the average when we have 20 values
    // otherwise it'll be too random
    if (this.processingTimeStats.length < 10) return 0;

    var total = 0;
    for (var i = 0; i < this.processingTimeStats.length; i++) {
      total = total + this.processingTimeStats[i];
    }

    this.precalculatedProcessingTimeAvg = Math.round(total / this.processingTimeStats.length);
    return this.precalculatedProcessingTimeAvg;
  },

  /**
   * Start timing subscribe messages
   */
  timingStartExtension: function() {
    return {
      incoming: function(message, req, callback) {
        if (message.channel !== '/meta/subscribe') return callback(message);

        if (!message._private) message._private = { };
        message._private.start = Date.now();

        callback(message);
      }
    };
  },

  /**
   * Tally timing of subscribe messages
   */
  timingEndExtension: function() {
    var self = this;

    return {
      outgoing: function(message, req, callback) {
        if (message.channel !== '/meta/subscribe') return callback(message);

        var start = message._private && message._private.start;
        if (start) {
          var duration = Date.now() - start;
          self._pushProcessingTime(duration);
        }

        callback(message);
      }
    };
  },

  /**
   * Adjusts the advice for 401 errors
   */
  adviceExtension: function() {
    var self = this;

    return {
      outgoing: function(message, req, callback) {
        delete message._private;
        var error = message.error;

        if(error) {
          var errorCode = error.split(/::/)[0];
          if(errorCode) errorCode = parseInt(errorCode, 10);

          if(errorCode === 401) {
            var reconnect;

            if(message.channel === '/meta/handshake') {
              // Handshake failing, go away
              reconnect = 'none';
            } else {
              // Rehandshake
              reconnect = 'handshake';
            }

            if (!message.advice) {
              message.advice = {
                interval: self.getFayeInterval() * 1000
              };
            }

            message.advice.reconnect = reconnect;
          }
        }

        callback(message);
      }
    };

  },

  /*
   * Continually update the advice settings on the Faye server
   */
  monitor: function(server) {
    var self = this;

    setInterval(function() {
      var timeout = self.getFayeTimeout();
      var interval = self.getFayeInterval();
      server.timeout = timeout;
      server._server._engine.timeout = timeout;
      server._server._engine.interval = interval;
    }, 10000).unref();
  }

};


module.exports = AdviceAdjuster;
