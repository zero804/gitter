/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true, process: false */
"use strict";

var nconf = require('nconf');

var configured = false;

module.exports = {
    configure: function() {
      if(configured) return nconf;

      /* Load configuration parameters */
      var nodeEnv = process.env['NODE_ENV'];
      if(!nodeEnv) {
        nodeEnv = 'dev';
        process.env['NODE_ENV'] = nodeEnv;
      }

      console.log("Using environment: " + nodeEnv);

      nconf.argv()
           .env();
      nconf.add('user', { type: 'file', file: './config/config.' + nodeEnv + '.json'  });
      nconf.add('defaults', { type: 'file', file: './config/config.default.json' });

      configured = true;
      return nconf;
    }
};