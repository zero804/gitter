#!/usr/bin/env node
/*jslint node: true */
"use strict";

var bayeux = require('../../server/web/bayeux');
var winston = require('../../server/utils/winston');

var opts = require("nomnom")
   .option('path', {
      abbr: 'p',
      required: false,
      help: 'Path to listen to'
   })
   .parse();

var path = opts.path || '/**';

bayeux.client.subscribe(path, function(message) {
  winston.debug("Message", message);
});
