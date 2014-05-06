/*jshint node:true, unused: true */
"use strict";

var winston = require('./winston');
var errorReporting = require('./error-reporting');
var domain = require('domain');
var shutdown = require('shutdown');

function dealWithUnhandledError(err) {

  try {
    errorReporting(err, { type: 'uncaught' });

    winston.error('----------------------------------------------------------------');
    winston.error('-- A VeryBadThing has happened.');
    winston.error('----------------------------------------------------------------');
    winston.error('Uncaught exception' + err, { message: err.message, name: err.name });

    if(err.stack) {
      winston.error('' + err.stack);
    }

    winston.error('Uncaught exception' + err + ' forcing shutdown');
  } catch(e) {
    /* This might seem strange, but sometime just logging the error will crash your process a second time */
    try {
      console.log('The error handler crashed too');
    } catch(e) {
    }
  }

  try {
    shutdown.shutdownGracefully(10);
  } catch(e) {
    console.log('The shutdown handler crashed too');
  }

}

exports.installUnhandledExceptionHandler = function() {
  process.on('uncaughtException', dealWithUnhandledError);
};

exports.domainWrap = function(inside) {
  // create a top-level domain for the server
  var serverDomain = domain.create();
  serverDomain.on('error', dealWithUnhandledError);
  serverDomain.run(inside);
};
