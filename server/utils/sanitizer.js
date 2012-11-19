/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var sanitizer = require("sanitizer");

function uriPolicy(uri) {
  return uri;
}

module.exports = {
  sanitize: function(html) {
    return sanitizer.sanitize(html, uriPolicy);
  }
};