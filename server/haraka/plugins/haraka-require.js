/*jslint node: true */
/*global describe:true, it: true, beforeEach:true, afterEach:true */
"use strict";

var fs = require('fs');


// THIS MODULE SEEMS NOT TO BE NEEDED, BUT IS
// Unfortunately haraka uses a strange method for compiling plugins, which means that normal
// relative folders for module references don't work as expected. This gets around the problem

function resolveModuleName(module) {
  if(module.indexOf('.') !== 0 && module.indexOf('/') !== 0) {
    return module;
  }

  var name = __dirname + '/../../' + module;
  name = fs.realpathSync(name + '.js');
  return name;
}

// when using this require function, the module path should be relative to the server directory
var harakaRequire = module.exports = function(module) {
  if(module.indexOf('.') !== 0 && module.indexOf('/') !== 0) {
    return require(module);
  }

  var name = resolveModuleName(module);
  return require(name);
};


harakaRequire.resolveModuleName = resolveModuleName;

