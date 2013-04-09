/*jslint node: true */
/*global describe:true, it: true, beforeEach:true, afterEach:true */
"use strict";

var proxyquireNoCallThru = require("proxyquire").noCallThru();

function resolveModuleName(module) {
  if(module.indexOf('.') !== 0 && module.indexOf('/') !== 0) {
    return module;
  }

  if(process.env['TROUPE_COVERAGE']) {
    return __dirname + '/../../coverage/' + module;
  }

  return __dirname + '/../../server/' + module;

}
// when using this require function, the module path should be relative to the server directory
var testRequire = module.exports = function(module) {
  if(module.indexOf('.') !== 0 && module.indexOf('/') !== 0) {
    return require(module);
  }

  if(process.env['TROUPE_COVERAGE']) {
    return require(__dirname + '/../../coverage/' + module);
  }

  return require(resolveModuleName(module));

};

testRequire.withProxies = function(module, proxies) {
  var p = {};
  Object.keys(proxies).forEach(function(key) {
    p[resolveModuleName(key)] = proxies[key];
  });

  return proxyquireNoCallThru(resolveModuleName(module), p);
};