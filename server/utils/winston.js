/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var nconf = require('./config');
var winston = require("winston");
var fs = require('fs');
var path = require('path');

function reopenTransportOnHupSignal(fileTransport) {
  process.on('SIGHUP', function() {
    var fullname = path.join(fileTransport.dirname, fileTransport._getFile(false));

    function reopen() {
      if (fileTransport._stream) {
        fileTransport._stream.end();
        fileTransport._stream.destroySoon();
      }

      var stream = fs.createWriteStream(fullname, fileTransport.options);
      stream.setMaxListeners(Infinity);

      fileTransport._size = 0;
      fileTransport._stream = stream;

      fileTransport.once('flush', function () {
        fileTransport.opening = false;
        fileTransport.emit('open', fullname);
      });

      fileTransport.flush();
    }

    console.log('stat ', fullname);
    fs.stat(fullname, function (err) {
      if (err && err.code == 'ENOENT') {
        console.log('Reopening log file after logrotation');
        return reopen();
      }
    });

  });
}


function configureTransports() {
  winston.remove(winston.transports.Console);

  if(nconf.get('logging:logToFile')) {
    winston.add(winston.transports.File, {
      filename: nconf.get('LOG_FILE'),
      level: nconf.get("logging:level")
    });

    var fileTransport = winston['default'].transports.file;
    reopenTransportOnHupSignal(fileTransport);

  } else {
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