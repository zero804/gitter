/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

/* Listen for SIGUSR1 signals to start/stop profiling */
// require('./utils/profiler');

var express  = require('express');
var http     = require('http');
var shutdown = require('./utils/shutdown');
var domainWrapper = require('./utils/domain-wrapper');

require('./utils/diagnostics');

var app = express();

var server = http.createServer(domainWrapper(app));

var gracefullyClosing = false;
app.use(function(req, res, next) {
  if(!gracefullyClosing) return next();

  res.setHeader("Connection", "close");
  res.send(502, "Server is in the process of restarting");
});


shutdown.installUnhandledExceptionHandler();
shutdown.addHandler('web', 20, function(callback) {
  gracefullyClosing = true;
  server.close(callback);
});


return server;
