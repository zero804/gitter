/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var mongoose = require('mongoose');
var Q = require('q');

module.exports = function onMongoConnect(callback) {
  var d;

  if(mongoose.connection.readyState === 1) {
    setImmediate(callback);
    d = Q.resolve();
  } else {
    d = Q.defer();
    mongoose.connection.once('open', d.makeNodeResolver());
  }

  return d.promise.nodeify(callback);
};
