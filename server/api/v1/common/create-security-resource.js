'use strict';

function SecurityResourceRoute(options) {
  this.id = options.id;
  this.getSecurityDescriptor = options.getSecurityDescriptor;
  this.subresources = options.subresources;
}

SecurityResourceRoute.prototype.index = function(/*req, res*/) {
  return {};
}

SecurityResourceRoute.prototype.updateRoot = function(/*req, res*/) {
  return {};
}

function createSecurityResource(options) {
  return new SecurityResourceRoute(options);
}

module.exports = createSecurityResource;
