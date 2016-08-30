'use strict';

function SecurityResourceRoute(options) {
  this.id = options.id;
}

SecurityResourceRoute.prototype.index = function(/*req, res*/) {
  return [];
}

function createSecurityResource(options) {
  return new SecurityResourceRoute(options);
}

module.exports = createSecurityResource;
