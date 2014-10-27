/*jshint node:true */
"use strict";

var cld = require('cld');
var Q = require('q');

module.exports = exports = function languageDetector(text) {
  var d = Q.defer();

  cld.detect(text, function(err, result) {
    if(err) return d.resolve(); // Ignore errors

    if(!result || !result.languages || !result.languages.length) return d.resolve();

    var primary = result.languages[0];
    return d.resolve(primary.code);
  });

  return d.promise;
};
