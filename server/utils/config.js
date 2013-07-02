/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global console:false, require: true, module: true, process: false */
"use strict";

var nconf = require('nconf');
var Fiber = require('./fiber');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;

/* Load configuration parameters */
var nodeEnv = process.env['NODE_ENV'];
if(!nodeEnv) {
  if(!nodeEnv) {
    nodeEnv = 'dev';
  }

  process.env['NODE_ENV'] = nodeEnv;
}

console.log("Using environment: " + nodeEnv);

var configDir = __dirname + '/../../config';
if(process.env['TROUPE_CONFIG_DIR_OVERRIDE']) {
  configDir = process.env['TROUPE_CONFIG_DIR_OVERRIDE'];
  console.log("Overridden config directory: " + configDir);
}

nconf.argv()
     .env();
nconf.add('user',     { type: 'file', file: configDir + '/config.user-overrides.json'  });
nconf.add('nodeEnv',  { type: 'file', file: configDir + '/config.' + nodeEnv + '.json'  });
nconf.add('defaults', { type: 'file', file: configDir + '/config.default.json' });

process.on('SIGHUP', function() {
  var f = new Fiber();
  nconf.stores.user.load(f.waitor());
  nconf.stores.nodeEnv.load(f.waitor());
  nconf.stores.defaults.load(f.waitor());
  f.all()
    .then(function() {
      nconf.events.emit('reload');
    })
    .fail(function(err) {
      console.log('Reload failed: ' + err, err);
    });
});

// Monkey-patch an event-emitter onto nconf (for now)
nconf.events = new EventEmitter();

module.exports = nconf;