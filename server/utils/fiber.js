/*jshint node:true */
"use strict";

var Q = require('q');

// note: Make sure that waitors are created at the same callback level as the fiber.sync() is run,
// so that the waitors are not accidentally only queued in a deeper callback level,
// which would be after the sync() function is run, instead of before.
function Fiber() {
  this.waitingFor = [];
}

// creates a new deffered resolver and adds it to the queue
// returns a (node style!!) resolver that should be passed as the callback for the async method.
Fiber.prototype.waitor = function() {
  var d = Q.defer();
  var resolver = d.makeNodeResolver();
  this.waitingFor.push(d.promise);

  return resolver;
};

// effectively syncs the fiber
Fiber.prototype.all = Fiber.prototype.sync = function() {
  return Q.all(this.waitingFor);
};

module.exports = Fiber;