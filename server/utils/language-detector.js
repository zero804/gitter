/*jshint node:true */
"use strict";

var cld = require('cld');
var Promise = require('bluebird');

module.exports = exports = function languageDetector(text) {

  return Promise.fromCallback(function(callback) {
      cld.detect(text, callback);
    })
    .then(function(result) {
      if(!result || !result.languages || !result.languages.length) return;

      var primary = result.languages[0];
      return primary.code;
    });
};
