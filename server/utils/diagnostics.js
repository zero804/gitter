/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var nconf = require('./config');
var winston = require('./winston');

if(nconf.get('diagnostics:heapdump')) {
  process.env.NODE_HEAPDUMP_OPTIONS = 'nosignal';

  var heapdump = require('heapdump');

  process.on('SIGUSR2', function() {
    var filename = '/tmp/heap.' + Date.now() + '.heapsnapshot';
    winston.error('Writing heapsnapshot: ' + filename);
    heapdump.writeSnapshot(filename);
  });

}