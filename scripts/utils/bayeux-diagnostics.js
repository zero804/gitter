#!/usr/bin/env node
/*jslint node: true */
"use strict";

var bayeux = require('../../server/web/bayeux');
var winston = require('../../server/utils/winston');

var opts = require("nomnom")
   .option('count', {
      abbr: 'c',
      default: 10
   })
   .option('wait', {
      abbr: 'w',
      default: 1000
   })
   .parse();


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
  bayeux.client.publish('/api/private/diagnostics', message);
  setTimeout(send, opts.wait);
}

send();

