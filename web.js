/*jslint node: true */
"use strict";

require('newrelic');

var env = require('./server/utils/env');
env.installUncaughtExceptionHandler();

env.domainWrap(function() {
  require('./server/web.js');
});
