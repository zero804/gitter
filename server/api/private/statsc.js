/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var env            = require('../../utils/env');
var stats          = env.stats;
var logger         = env.logger;

function handleStats(incomingStats) {
  if(!incomingStats || !Array.isArray(incomingStats)) return;

  incomingStats.forEach(function(s) {
    if(!s) return;

    var stat = s.stat;

    if(!stat || typeof stat !== 'string' || !stat.match(/^[\w\-\.]{2,20}$/)) {
      /* Ignore */
      return;
    }

    var statsName = 'client.' + stat;

    if('value' in s) {
      var value = s.value;
      if(typeof value !== 'number') return; /* Ignore */
      stats.gaugeHF(statsName, value);
      return;
    }

    if('time' in s) {
      var time = s.time;
      if(typeof time !== 'number') return; /* Ignore */
      stats.responseTime(statsName, time);
      return;
    }

    var count = s.count;
    stats.eventHF(statsName, count || 1);
  });
}

module.exports =  function(req, res) {
  var stats = req.body;

  try {
    handleStats(stats);
  } catch(e) {
    logger.error('Problem dealing with stats: ' + e, { exception: e });
  }

  res.send('OK');
};

