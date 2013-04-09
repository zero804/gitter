/*jslint node: true */
/*global describe:true, it: true, beforeEach:true, afterEach:true */
"use strict";

// when using this require function, the module path should be relative to the server directory
module.exports = function(module) {
  if(module.indexOf('.') !== 0 && module.indexOf('/') !== 0) {
    return require(module);
  }

  if(process.env['COVERAGE']) {
    return require(__dirname + '/../../coverage/' + module);
  }

  return require(__dirname + '/../../server/' + module);

};