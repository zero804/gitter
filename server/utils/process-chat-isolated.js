"use strict";

var env           = require('../utils/env');
var errorReporter = env.errorReporter;
var stats         = env.stats;
var workerFarm    = require('worker-farm');
var shutdown      = require('shutdown');
var Q             = require('q');
var StatusError   = require('statuserror');
var farm;

function startWorkerFarm() {
  farm = workerFarm({
      maxConcurrentWorkers: 1,
      maxConcurrentCallsPerWorker: 1,
      maxCallTime: 3000
    },
    require.resolve('./process-chat-async'));

  shutdown.addHandler('markdown_cluster', 1, function(callback) {
    shutdownFarm(callback);
  });

}

function processChatIsolated(text, callback) {
  if(!farm) startWorkerFarm();

  var d = Q.defer();
  farm(text, d.makeNodeResolver());

  return d.promise
    .fail(function(err) {
      stats.event('markdown.failure');

      if(err.type === 'TimeoutError') {
        var newError = new StatusError(500, "Markdown processing failed");
        errorReporter(newError, { text: text });
        throw newError;
      }
      throw err;
    })
    .nodeify(callback);
}

function shutdownFarm(callback) {
  if(farm) {
    workerFarm.end(farm, callback);
    farm = null;
  } else {
    setImmediate(callback);
  }
}

processChatIsolated.testOnly = {
  shutdown: function(done) {
    shutdownFarm(function() {
      setTimeout(done, 150);
        // Add an extra time on cos mocha will just exit without waiting
        // for the child to shutdown
    });
  }
};

module.exports = exports = processChatIsolated;
