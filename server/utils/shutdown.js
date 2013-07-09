/*jshint node:true */
"use strict";

var winston = require('./winston');
var events = require('events');
var eventEmitter = new events.EventEmitter();
var Q = require('q');
var _ = require('underscore');

function shutdownGracefully() {
  winston.info("Starting graceful shutdown procedure");
  var timer = setTimeout(function(err) {
      winston.info("Timeout awaiting graceful shutdown. Forcing shutdown.");
      process.exit(11);
  }, 100000);

  performNextShutdownStage();
}

var handlers = {};
process.on('SIGTERM', function() {
  shutdownGracefully();
});

function performNextShutdownStage() {
  var keys = Object.keys(handlers).map(function(k) { return parseInt(k, 10); });
  if(keys.length === 0) {
    winston.info("Shutdown complete");
    process.exit(0);
    return;
  }

  var nextStage = _.max(keys);
  winston.info("Performing shutdown stage " + nextStage);

  var stageHandlers = handlers[nextStage];
  delete handlers[nextStage];

  var promises = stageHandlers.map(function(handler) {
    var d = Q.defer();
    try {
      winston.info("Invoking " + handler._stageName + " shutdown handler");
      var fn = d.makeNodeResolver();
      handler(fn);
    } catch(e) {
      winston.info("Exception occurred while handling shutdown" + e);
      d.reject(e);
    }
    return d.promise;
  });

  var all = Q.all(promises);
  Q.timeout(all, 30000)
    .then(function () {
      winston.info("Shutdown stage " + nextStage + " complete");
      performNextShutdownStage();
    }, function (err) {
      stageHandlers.forEach(function(handler, index) {
        if(promises[index]) {
           winston.info("Error while waiting for " + handler._stageName + " to complete");
        }
      });

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

exports.installUnhandledExceptionHandler = function() {
  //
  // Do nothing
  return;

  //
  process.on('uncaughtException', function(err) {
    winston.error('----------------------------------------------------------------');
    winston.error('-- A VeryBadThing has happened.');
    winston.error('----------------------------------------------------------------');
    winston.error('Uncaught exception' + err, { message: err.message, name: err.name });

    if(err.stack) {
      winston.error('' + err.stack);
    }

    winston.error('Uncaught exception' + err + ' forcing shutdown');
    shutdownGracefully();

  });

};

exports.shutdownGracefully = shutdownGracefully;


