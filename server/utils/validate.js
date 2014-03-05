/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var Q = require('q');
var winston = require('./winston');

var m = {
  expect: function(value, message) {
    if(!value) {
      winston.warn('failed-validation:' + message);
      console.trace();
      throw 400;
    }
  },

  fail: function(message) {
    winston.warn('failed-validation:' + message);
    console.trace();
    throw 400;
  },
};

Object.keys(m).forEach(function(key) {
  m[key + 'Q'] = Q.denodeify(m[key]);
});

module.exports = m;