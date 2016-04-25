'use strict';

var installed = false;
exports.install = function() {
  if (installed) return;
  installed = true;

  var events = require('gitter-web-persistence-events');
  var persistence = require('gitter-web-persistence');
  events.install(persistence);
};
