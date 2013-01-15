/*jshint node:true */
"use strict";

var Q = require('q');

function Fiber() {
  this.waitingFor = [];
}

// creates a new deffered resolver and adds it to the queue
// returns a (node style!!) resolver that should be passed as the callback for the async method.
Fiber.prototype.waitor = function() {
  var d = Q.defer();
  var resolver = d.node();
  this.waitingFor.push(d.promise);

  return resolver;
};

// effectively syncs the fiber
Fiber.prototype.all = Fiber.prototype.sync = function() {
  return Q.all(this.waitingFor);
};

module.exports = Fiber;