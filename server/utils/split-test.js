/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var debug = require('debug')('gitter:split-test');

var splitTest = function(ctx, key) {
  if (!ctx) return key;

  var variant = ctx.variant || 'control';
  debug('Variant: %s | Testing: %s', variant, key);
  return key + '_' + variant;
};

module.exports = splitTest;
