/*jshint node:true */
/*global consol:true*/
"use strict";

exports.readStreamIntoString = function(stream, callback) {
  var str =  "";

  stream.on('data', function(chunk) {
    str += (chunk || "").toString("utf-8");
  });

  stream.on('end', function(chunk) {
    str += (chunk || "").toString("utf-8");
    callback(null, str);
  });

  stream.on('error', function(err) {
    callback(err);
  });

  stream.resume();

};