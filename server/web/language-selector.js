/*jshint node: true */
"use strict";

var DEFAULT = ['en-GB'];
module.exports = function(req) {
  if(!req || !req.headers) return DEFAULT;

  var language = req.headers['accept-language'];
  if(language) {
    var array = language.split(';')[0].split(',');
    if(array.length) {
      return array;
    }
  }

  return DEFAULT;
};
