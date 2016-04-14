#!/usr/bin/env node
/*jslint node: true */
"use strict";

var env = require('gitter-web-env');
var winston = env.logger;
var bayeux = require('../../server/web/bayeux');

var opts = require('yargs')
   .option('count', {
      alias: 'c',
      default: 10
   })
   .option('wait', {
      alias: 'w',
      default: 1000
   })
   .help('help')
  .alias('help', 'h')
  .argv;


var sentCount = 0;
function send() {
  sentCount++;
  if(sentCount > opts.count) {
    setTimeout(function() {
      process.exit(0);
    }, 1000);
    return;
  }
  console.log('SENDING...', sentCount);
  var message = { number: sentCount };
  bayeux.publish('/api/private/diagnostics', message);
  setTimeout(send, opts.wait);
}

send();
