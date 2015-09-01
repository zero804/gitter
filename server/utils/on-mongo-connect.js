/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var mongoose = require('mongoose');
var Q = require('q');
var debug = require('debug')('gitter:on-mongo-connect');

module.exports = function onMongoConnect(callback) {
  var promise;

  if(mongoose.connection.readyState === 1) {
    debug('Mongo already ready, continuing immediately');
    promise = Q.resolve();
  } else {
    debug('Awaiting mongo connection');
    var d = Q.defer();
    promise = d.promise;

    mongoose.connection.once('open', function() {
      debug('Mongo connection ready');
      d.resolve();
    });
  }

  return promise.nodeify(callback);
};
