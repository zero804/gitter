/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var mongoose = require('mongoose');
var Q = require('q');

module.exports = function onMongoConnect(callback) {
  var promise;

  if(mongoose.connection.readyState === 1) {
    promise = Q.resolve();
  } else {
    var d = Q.defer();
    promise = d.promise;
    mongoose.connection.once('open', d.makeNodeResolver());
  }

  return promise.nodeify(callback);
};
