/*jslint node: true */
"use strict";

var profiler,
    winston = require("winston");

process.on('SIGUSR1', function() {

  if(profiler) {
    winston.info("profiler: stopping");
    profiler.stopProfiling('signal');
    profiler = null;
  }  else {
    winston.info("profiler: starting");
    profiler = require('v8-profiler');
    profiler.startProfiling('signal');

   profiler.takeSnapshot('signal-heap');

  }
});