"use strict";

var log = require('loglevel');

window.gitterSetLogLevel = function(level) {
  log.setLevel(level);
};

module.exports = log;
