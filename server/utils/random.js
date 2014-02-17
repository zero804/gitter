/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var crypto = require('crypto');
var Q = require('q');

// Token length in bytes. 20 byts == 40 hex chars
var tokenLength = 20;

// Generate a cryptographically secure random token 

exports.generateTokenQ = function() {
  var deferred = Q.defer();
  crypto.randomBytes(tokenLength, function(ex, buf) {
    if (ex) {
      deferred.reject(new Error(ex));
    } else {
      var token = buf.toString('hex');
      deferred.resolve(token);
    }
  });
  return deferred.promise;
};

exports.generateToken = function(cb) {
  crypto.randomBytes(tokenLength, function(ex, buf) {
    if (ex) { 
      return cb(ex, null);
    }
    var token = buf.toString('hex');
    return cb(null, token);
  });
};
