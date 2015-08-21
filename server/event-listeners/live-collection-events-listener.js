'use strict';

var installed = false;

exports.install = function() {
  if (installed) return;
  installed = true;

  require('../services/live-collections').install();
};
