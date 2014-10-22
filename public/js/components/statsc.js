define([
  'underscore',
  'utils/appevents',
  'components/apiClient',
  'log!stats'
], function(_, appEvents, apiClient, log) {
  "use strict";

  var statQueue = [];
  var counters = {};

  function send() {
    var sendCounters = counters;
    counters = {};
    var sendQueue = statQueue;
    statQueue = [];

    sendQueue = sendQueue.concat(Object.keys(sendCounters).map(function(stat) {
      var result = { stat: stat };
      if(sendCounters[stat] > 1) {
        result.count = sendCounters[stat];
      }
      return result;
    }));

    if(!sendQueue.length) return;

    apiClient.priv.post('/statsc', sendQueue, { dataType: 'text' })
      .fail(function() {
        log('An error occurred while communicating stats');
      });

  }

  var throttledSend = _.throttle(send, 10000, { leading: false });

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





});
