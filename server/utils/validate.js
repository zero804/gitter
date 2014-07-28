/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q = require('q');
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

Object.keys(m).forEach(function(key) {
  m[key + 'Q'] = Q.denodeify(m[key]);
});

module.exports = m;
