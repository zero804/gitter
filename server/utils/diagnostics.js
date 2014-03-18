/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var nconf = require('./config');
var winston = require('./winston');

if(nconf.get('diagnostics:heapdump')) {
  process.env.NODE_HEAPDUMP_OPTIONS = 'nosignal';

  var heapdump = require('heapdump');

  process.on('SIGUSR2', function() {
    var filename = '/tmp/heap.' + Date.now() + '.heapsnapshot';
    winston.warn('Writing heapsnapshot: ' + filename);
    heapdump.writeSnapshot(filename);
  });

  var memwatch = require('memwatch');
  memwatch.on('leak', function(info) {
    winston.warn('memwatch: leak: ' + info.reason);
  });

  memwatch.on('stats', function(stats) {
    winston.info('memwatch: stats: ', stats);
  });
}