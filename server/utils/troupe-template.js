var fs = require("fs");
var path = require("path");
var hogan = require('hogan');

function loadSource(sourceFile) {
  var sourceFileName = 'views/' + sourceFile + '.mustache';
  
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
