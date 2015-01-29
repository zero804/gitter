"use strict";
var _ = require('underscore');
var appEvents = require('utils/appevents');
var apiClient = require('components/apiClient');
var log = require('utils/log');

module.exports = (function() {


  var statQueue = [];
  var counters = {};

  function send() {
    var sendCounters = counters;
    counters = {};
    var sendQueue = statQueue;
    statQueue = [];

    sendQueue = sendQueue.concat(Object.keys(sendCounters).map(function(stat) {
      var result = { stat: stat };
      if(sendCounters[stat] > 0) {
        result.count = sendCounters[stat];
      }
      return result;
    }));

    if(!sendQueue.length) return;

    apiClient.priv.post('/statsc', sendQueue, { dataType: 'text' })
      .fail(function() {
        log.info('An error occurred while communicating stats');
      });

  }

  var throttledSend = _.throttle(send, 1000, { leading: false });

  appEvents.on('stats.event', function(stat) {
    if(counters[stat]) {
      counters[stat]++;
    } else {
      counters[stat] = 1;
    }
    throttledSend();
  });

  appEvents.on('stats.gauge', function(stat, value) {
    statQueue.push({ stat: stat, value: value });
    throttledSend();
  });

  appEvents.on('stats.time', function(stat, time) {
    statQueue.push({ stat: stat, time: time });
    throttledSend();
  });






})();

