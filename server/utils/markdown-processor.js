/* jshint node:true */
"use strict";

var env           = require('../utils/env');
var errorReporter = env.errorReporter;
var stats         = env.stats;
var Processor     = require('gitter-markdown-processor');
var shutdown      = require('shutdown');
var StatusError   = require('statuserror');
var Q             = require('q');

// processor starts its own process, so lazy load it
var processor;

module.exports = function(markdown) {
  if(!processor) {
    processor = createProcessor();
  }

  var deferred = Q.defer();

  processor.process(markdown, function(err, result) {
    if(err) {
      stats.event('markdown.failure');

      if(result) {
        // hey, at least we got a result!
        // Lets note the error though
        var newError = new StatusError(500, "Markdown processing failed");
        errorReporter(newError, { text: markdown });

        // ...and pretend it never happened
        return deferred.resolve(result);
      } else {
        return deferred.reject(err);
      }
    }

    return deferred.resolve(result);
  });

  return deferred.promise;
};

function createProcessor() {
  var p = new Processor();

  shutdown.addHandler('markdown_cluster', 1, function(callback) {
    p.shutdown(callback);
  });

  return p; 
}
