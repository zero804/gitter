#!/usr/bin/env node
/*jslint node: true */
"use strict";

var bayeux = require('../../server/web/bayeux');
var winston = require('../../server/utils/winston');

var opts = require('yargs')
   .option('path', {
      alias: 'p',
      required: false,
      description: 'Path to listen to'
   })
   .help('help')
  .alias('help', 'h')
  .argv;

var path = opts.path || '/**';

bayeux.client.subscribe(path, function(message) {
  winston.debug("Message", message);
});
