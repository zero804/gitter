/*jslint node: true */
"use strict";

var env = require('./server/utils/env');
env.installUncaughtExceptionHandler();

env.domainWrap(function() {
  require('./server/web.js');
});
