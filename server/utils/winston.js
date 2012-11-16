/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true, process: false */
"use strict";

var nconf = require('./config');
var winston = require("winston");

winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
  colorize: nconf.get("logging:colorize"),
  timestamp: nconf.get("logging:timestamp"),
  level: nconf.get("logging:level")
});

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

module.exports = winston;