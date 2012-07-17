/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true, process: false */
"use strict";

var nconf = require('./config').configure();
var winston = require("winston");

var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ colorize: true, timestamp: true})
    ]
});


module.exports = logger;