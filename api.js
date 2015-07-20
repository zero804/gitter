/*jslint node: true */
"use strict";

var env = require('gitter-web-env');
env.installUncaughtExceptionHandler();

env.domainWrap(function() {
  require('./server/api.js');
});
