/*jshint globalstrict:true, trailing:false unused:true node:true*/
/*global console:false, require: true, module: true, process: false */
"use strict";

var nconf = require('nconf');

/* Load configuration parameters */
var nodeEnv = process.env['NODE_ENV'];
if(!nodeEnv) {
  nodeEnv = 'dev';
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

module.exports = nconf;