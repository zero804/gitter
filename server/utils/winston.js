/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var nconf = require('./config');
var winston = require("winston");
var LogstashUDP = require('winston-logstash-udp').LogstashUDP;
var fs = require('fs');
var path = require('path');
var Q = require('q');

var defaultLogger = new winston.Logger({
  transports: []
});


function statFile(fileTransport) {
  if(!fileTransport) return;

  var fullname = path.join(fileTransport.dirname, fileTransport._getFile(false));

  function reopen() {
    fileTransport.close();
    fileTransport._stream = null;
    fileTransport.once('open', function() {
      defaultLogger.info('Log rotation completed');
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

var periodicListenerConfigured = false;
function periodicallyStatFile() {
  if(periodicListenerConfigured) return;
  periodicListenerConfigured = true;

  setInterval(function() {
    statFile(defaultLogger.transports.file);
  }, 30000);
}

var hupListenerConfigured = false;
function reopenTransportOnHupSignal() {
  if(hupListenerConfigured) return;
  hupListenerConfigured = true;

  process.on('SIGHUP', function() {
    console.log('Caught SIGHUP, attempting logfile rotation');
    defaultLogger.info('Caught SIGHUP, attempting logfile rotation');

    statFile(defaultLogger.transports.file);
  });
}

function attachEventHandlers() {
  var statsService;

  defaultLogger.on('logging', function (transport, level) {
    if(!statsService) {
      statsService = require('../services/stats-service');
    }
    
    try {
      switch(level) {
        case 'warn':
          statsService.eventHF('logged.warn');
          break;
        case 'error':
          statsService.eventHF('logged.error');
          break;
        case 'fatal':
          statsService.eventHF('logged.fatal');
          break;
      }
    } catch(e) {
      console.log('Error calling stats service', e);
    }
  });

  defaultLogger.on('error', function (err) {
    console.error('Logging error: ' + err, err);
    if(err && err.stack) {
      console.error(err.stack);
    }
  });
}

function configureTransports() {
  for (var name in defaultLogger.transports) {
    defaultLogger.remove({ name: name });
  }

  if (nconf.get('logging:logstash:enabled')) {

    var logstash_opts = {
      appName:  'Troupe app',
      port:     nconf.get('logging:logstash:port'),
      host:     nconf.get('logging:logstash:host')
    };

    defaultLogger.add(LogstashUDP, logstash_opts);

  }

  if(nconf.get('logging:logToFile') && nconf.get('LOG_FILE')) {
    defaultLogger.add(winston.transports.File, {
      filename: nconf.get('LOG_FILE'),
      level: nconf.get("logging:level"),
      timestamp: true,
      maxFiles: null,
      maxsize: null,
      json: false
    });

    var fileTransport = defaultLogger.transports.file;
    periodicallyStatFile(fileTransport);
    reopenTransportOnHupSignal(fileTransport);

    fileTransport(consoleTransport);

  } else {
    if(nconf.get('logging:logToFile') && !nconf.get('LOG_FILE')) {
      console.log('Logging to file is configured by LOG_FILE environment variable has not been set. Logging to console');
    }


    if(!nconf.get("logging:disableConsole")) {

      defaultLogger.add(winston.transports.Console, {
        colorize: nconf.get("logging:colorize"),
        timestamp: nconf.get("logging:timestamp"),
        level: nconf.get("logging:level"),
        prettyPrint: nconf.get("logging:prettyPrint")
      });

      var consoleTransport = defaultLogger.transports.console;
      attachEventHandlers(consoleTransport);
    }
  }

}

configureTransports();

// var oldError = winston.error;
// winston.error = function(message, data) {
//   function formatStackTrace(stack) {
//     if(stack.join) {
//       return stack.join('\n');
//     }

//     return '' + stack;
//   }


//   if(data && data.exception) {
//     console.error(data.exception);

//     if(data.exception.stack) {
//         data.stack = formatStackTrace(data.exception.stack);
//     }

//     if(data.exception.message) {
//       data.errorMessage = data.exception.message;
//       delete data.exception;
//     }
//   }
//   oldError.apply(winston, arguments);

// };

var logLevel = nconf.get("logging:level");

nconf.events.on('reload', function() {
  if(logLevel ===  nconf.get("logging:level")) {
    return;
  }

  logLevel = nconf.get("logging:level");
  console.log("Reconfiguring log transports");

  configureTransports();
});



// This really doens't have a home, but logging shows stack
// traces, so it'll go here for now
Q.longStackSupport = !!nconf.get("logging:longStackSupport");
Error.stackTraceLimit = 100;

module.exports = defaultLogger;
