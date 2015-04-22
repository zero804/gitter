/*jslint node: true */
"use strict";

var env = require('./server/utils/env');
env.installUncaughtExceptionHandler();

if (env.config.get('newrelic:enabled')) require('newrelic');

env.domainWrap(function() {
  require('./server/web.js');
});
