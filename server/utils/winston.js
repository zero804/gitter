/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var nconf = require('./config');
var winston = require("winston");
var fs = require('fs');
var path = require('path');
var assert = require('assert');

function statFile(fileTransport) {
  assert(fileTransport, 'fileTransport must exist');

  var fullname = path.join(fileTransport.dirname, fileTransport._getFile(false));

  function reopen() {
    fileTransport.close();
    fileTransport._stream = null;
    fileTransport.once('open', function() {
      winston.info('Log rotation completed');
      console.log('Log rotation completed');
    });
  }

  fs.stat(fullname, function (err, stat) {
    if (err && err.code == 'ENOENT') {
      console.log('Log file no longer exists. Reopening');
      return reopen();
    }

    if(fileTransport._stream && fileTransport._stream.fd) {

      fs.fstat(fileTransport._stream.fd, function(err2, fstat) {
        if(stat.dev != fstat.dev || stat.ino !== fstat.ino) {
          console.log('File inode mismatch. Reopening');
          return reopen();
        }
      });

    }

  });
}

function periodicallyStatFile(fileTransport) {
  setInterval(function() {
    statFile(fileTransport);
  }, 30000);
}

function reopenTransportOnHupSignal(fileTransport) {
  process.on('SIGHUP', function() {
    console.log('Caught SIGHUP, attempting logfile rotation');
    winston.info('Caught SIGHUP, attempting logfile rotation');

    statFile(fileTransport);

  });
}


function configureTransports() {
  winston.remove(winston.transports.Console);

  if(nconf.get('logging:logToFile') && nconf.get('LOG_FILE')) {
    winston.add(winston.transports.File, {
      filename: nconf.get('LOG_FILE'),
      level: nconf.get("logging:level"),
      timestamp: true,
      maxFiles: null,
      maxsize: null,
      json: false
    });

    var fileTransport = winston['default'].transports.file;
    periodicallyStatFile(fileTransport);
    reopenTransportOnHupSignal(fileTransport);

  } else {
    if(nconf.get('logging:logToFile') && !nconf.get('LOG_FILE')) {
      console.log('Logging to file is configured by LOG_FILE environment variable has not been set. Logging to console');
    }

    winston.add(winston.transports.Console, {
      colorize: nconf.get("logging:colorize"),
      timestamp: nconf.get("logging:timestamp"),
      level: nconf.get("logging:level"),
      prettyPrint: nconf.get("logging:prettyPrint")
    });

  }

  if(nconf.get("logging:loggly")) {
    //
    // Requiring `winston-loggly` will expose
    // `winston.transports.Loggly`
    //
    require('winston-loggly');

    winston.add(winston.transports.Loggly, {
      level: nconf.get("logging:logglyLevel"),
      subdomain: nconf.get("logging:logglySubdomain"),
      inputToken: nconf.get("logging:logglyInputToken")
    });

  }
}

configureTransports();


var oldError = winston.error;
winston.error = function(message, data) {

  function formatStackTrace(stack) {
    if(stack.join) {
      return stack.join('\n');
    }

    return '' + stack;
  }

  if(data && data.exception && data.exception.stack) {
    data.stack = formatStackTrace(data.exception.stack);
  }
  oldError.apply(winston, arguments);
};

module.exports = winston;