/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */

var sanitizer = require("sanitizer");
var console = require("console");

function uriPolicy(uri) {
  // TODO: come up with a proper URI policy!
  console.dir(["uriPolicy", arguments]);
  return uri;
}

module.exports = {
  sanitize: function(html) {
    console.log("SANTIZE!")
    return sanitizer.sanitize(html, uriPolicy);
  }
}