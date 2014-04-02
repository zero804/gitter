/*jslint node: true */
"use strict";

var shutdown = require('./server/utils/shutdown');

shutdown.domainWrap(function() {
  require('./server/web.js');
});
