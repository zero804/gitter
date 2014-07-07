define([
  'jquery',
  'underscore',
  './csrf',
  'utils/appevents',
  'log!stats'
], function($, _, csrf, appEvents, log) {
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

    $.ajax({
      url: '/api/private/statsc',
      dataType: 'text',
      contentType: "application/json",
      data: JSON.stringify(sendQueue),
      beforeSend: csrf,
      global: false,
      type: "POST",
      error: function() {
        log('An error occurred while communicating stats');
      }
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
