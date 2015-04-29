/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var nconf = require('./config');
var winston = require('./winston');

if (nconf.get('newrelic:enabled')) require('newrelic');

/* Heapdump and nodemon don't play nicely together */

if(!process.env.NODEMON) {
  /* Heapdump is now always on */
  process.env.NODE_HEAPDUMP_OPTIONS = 'nosignal';
  var heapdump = require('heapdump');
  process.on('SIGUSR2', function() {
    var filename = 'heap.' + Date.now() + '.heapsnapshot';
    winston.warn('Writing heapsnapshot: ' + filename);
    heapdump.writeSnapshot(filename);
  });
}

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
