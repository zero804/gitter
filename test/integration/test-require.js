/*jslint node: true */
/*global describe:true, it: true, beforeEach:true, afterEach:true */
"use strict";

var fs = require('fs');

var proxyquireNoCallThru = require("proxyquire").noCallThru();

function resolveModuleName(module) {
  if(module.indexOf('.') !== 0 && module.indexOf('/') !== 0) {
    return module;
  }

  var n;
  if(process.env['TROUPE_COVERAGE']) {
    n = __dirname + '/../../coverage/' + module;
  } else {
    n = __dirname + '/../../server/' + module;
  }

  n = fs.realpathSync(n + '.js');
  return n;
}

// when using this require function, the module path should be relative to the server directory
var testRequire = module.exports = function(module) {
  if(module.indexOf('.') !== 0 && module.indexOf('/') !== 0) {
    return require(module);
  }

  var name = resolveModuleName(module);
  return require(name);
};

testRequire.resolveModuleName = resolveModuleName;

testRequire.withProxies = function(module, proxies, fullProxyNames) {
  if(fullProxyNames) {
    var np = {};
    Object.keys(proxies).forEach(function(key) {
      np[resolveModuleName(key)] = proxies[key];
    });
    proxies = np;
  }

  return proxyquireNoCallThru(resolveModuleName(module), proxies);
};