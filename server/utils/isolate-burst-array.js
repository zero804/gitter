'use strict';

var backboneAdapter = require('./backbone-adapter');
var isolateBurst = require('../../shared/burst/isolate-burst');

module.exports = function(collection, model) {
  return isolateBurst(new backboneAdapter.ArrayAdapter(collection), new backboneAdapter.ArrayAdapter(model));
};
