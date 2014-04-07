/*jslint node: true */
"use strict";

var shutdown = require('./server/utils/shutdown');

shutdown.installUnhandledExceptionHandler();
shutdown.domainWrap(function() {
  require('./server/websockets.js');
});
