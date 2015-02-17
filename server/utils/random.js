/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var crypto = require('crypto');
var Q = require('q');

// Token length in bytes. 20 byts == 40 hex chars
var tokenLength = 20;
var shortTokenLength = 4;

// Generate a cryptographically secure random token
exports.generateToken = function(cb) {
  var d = Q.defer();

  crypto.randomBytes(tokenLength, function(err, buf) {
    if (err) return d.reject(err);

    var token = buf.toString('hex');
    return d.resolve(token);
  });

  return d.promise.nodeify(cb);
};

// Generate a cryptographically secure random token
exports.generateShortToken = function(cb) {
  var d = Q.defer();

  crypto.randomBytes(shortTokenLength, function(err, buf) {
    if (err) return d.reject(err);

    var token = buf.toString('hex');
    return d.resolve(token);
  });

  return d.promise.nodeify(cb);
};
