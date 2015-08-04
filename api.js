/*jslint node: true */
"use strict";

var env = require('gitter-web-env');
env.installUncaughtExceptionHandler();
console.error('PID', process.pid);
env.domainWrap(function() {
  require('./server/api.js');
});
