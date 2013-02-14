/*jshint globalstrict:true, trailing:false unused:true node:true*/
"use strict";

var nconf = require('./config');
var winston = require("winston");

var oldError = winston.error;
winston.error = function(message, data) {
  if(data.exception && data.exception.stack) {
    console.error(data.exception.stack);
  }
  oldError.apply(winston, arguments);
};

winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
  colorize: nconf.get("logging:colorize"),
  timestamp: nconf.get("logging:timestamp"),
  level: nconf.get("logging:level"),
  prettyPrint: nconf.get("logging:prettyPrint")
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

winston.prefix = function(prefix) {
  return winston;

  /*
   TODO: add prefixes, something like this:
  console.log("PREFIX IS " + prefix);
  var a = {};
  _.extend(a, winston, {
    log: function (level, msg, obj) {

      console.log("LOGGING " + prefix);

      return winston.log(level, prefix + ": " + msg, obj);
    }
  });
  return a;
  */
};

module.exports = winston;