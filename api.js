/*jslint node: true */
"use strict";

var unhandledExceptions = require('./server/utils/unhandled-exceptions');

unhandledExceptions.installUnhandledExceptionHandler();
unhandledExceptions.domainWrap(function() {
  require('./server/api.js');
});

