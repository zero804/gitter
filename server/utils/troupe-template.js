/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true, process: false */
"use strict";

var fs = require("fs");
var path = require("path");
var hogan = require('hogan');

function loadSource(sourceFile) {
  var sourceFileName = 'public/templates/' + sourceFile + '.mustache';
  
  // TODO: make this async
  return fs.readFileSync(sourceFileName, "utf-8");
}

module.exports = {
  compile : function(sourceFile, options) {
    var source = loadSource(sourceFile);
    var template = hogan.compile(source, options);
    return template;
  }
};
