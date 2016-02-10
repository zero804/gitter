"use strict";

var winston = require('./winston');
var StatusError = require('statuserror');

var m = {
  expect: function(value, message) {
    if(!value) {
      winston.warn('failed-validation:' + message);
      throw new StatusError(400, message);
    }
  },

  fail: function(message) {
    winston.warn('failed-validation:' + message);
    throw new StatusError(400, message);
  },
};

module.exports = m;
