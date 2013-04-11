/*jslint node: true */
/*global describe:true, it: true, beforeEach:true, afterEach:true */
"use strict";

var proxyquireNoCallThru = require("proxyquire").noCallThru();
var fs = require('fs');

function resolveModuleName(module) {
  if(module.indexOf('.') !== 0 && module.indexOf('/') !== 0) {
    return module;
  }

  var f;
  if(process.env['TROUPE_COVERAGE']) {
    f = __dirname + '/../../coverage/' + module;
  } else {
    f = __dirname + '/../../server/' + module;
  }
  return fs.realpathSync(f + '.js');
}

// when using this require function, the module path should be relative to the server directory
var testRequire = module.exports = function(module) {
  if(module.indexOf('.') !== 0 && module.indexOf('/') !== 0) {
    return require(module);
  }

  if(process.env['TROUPE_COVERAGE']) {
    return require(resolveModuleName(__dirname + '/../../coverage/' + module));
  }

  return require(resolveModuleName(module));

};

testRequire.withProxies = function(module, proxies) {
  //var p = {};
  //Object.keys(proxies).forEach(function(key) {
    //p[resolveModuleName(key)] = proxies[key];
  //});

  //return proxyquireNoCallThru(resolveModuleName(module), p);
  return proxyquireNoCallThru(resolveModuleName(module), proxies);
};