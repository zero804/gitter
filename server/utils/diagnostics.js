/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var nconf = require('./config');
var winston = require('./winston');

/* Heapdump is now always on */
require('heapdump');

if(nconf.get('diagnostics:heapdump')) {
  var memwatch = require('memwatch');
  memwatch.on('leak', function(info) {
    winston.warn('memwatch: leak: ' + info.reason);
  });

  memwatch.on('stats', function(stats) {
    if(stats && stats.usage_trend) {
      winston.info('memwatch: stats: ', stats);
    }
  });
}