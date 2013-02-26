/*jshint node:true */
"use strict";

var winston = require('./winston');
var events = require('events');
var eventEmitter = new events.EventEmitter();
var Q = require('q');
var _ = require('underscore');

var handlers = {};
process.on('SIGTERM', function() {
  winston.info("Starting graceful shutdown procedure");
  setTimeout(function(err) {
      winston.info("Timeout awaiting graceful shutdown. Forcing shutdown.");
      process.exit(11);
  }, 100000);

  performNextShutdownStage();

});

function performNextShutdownStage() {
  console.dir(handlers);

  var keys = Object.keys(handlers).map(function(k) { return parseInt(k, 10); });
  console.dir(keys.length);
  if(keys.length === 0) {
    console.log("Shutdown complete");
    process.exit(0);
    return;
  }

  console.dir(keys);

  var nextStage = _.max(keys);
  console.log("Performing shutdown stage " + nextStage);

  var stageHandlers = handlers[nextStage];
  delete handlers[nextStage];

  var promises = stageHandlers.map(function(handler) {
    var d = Q.defer();
    try {
      console.log("Invoking " + handler._stageName);
      handler(d.makeNodeResolver());
    } catch(e) {
      console.log("Exception occurred while handling shutdown" + e);
      d.reject(e);
    }
    return d.promise;
  });

  var all = Q.all(promises);
  Q.timeout(all, 15000)
   .then(function() {
      console.log("Shutdown stage " + nextStage + " complete");
      performNextShutdownStage();
   })
   .fail(function(err) {
      console.log("An error occurred during shutdown", err);
      performNextShutdownStage();
   });

}

exports.addHandler = function addHandler(stageName, stageNumber, shutdownHandler) {
  var o = handlers[stageNumber];
  shutdownHandler._stageName = stageName;

  if(!o) {
    o = [shutdownHandler];
    handlers[stageNumber] = o;
  } else {
    o.push(shutdownHandler);
  }


};


