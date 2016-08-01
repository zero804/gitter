"use strict";

var Mocha = require('mocha');
var glob = require('glob');
var path = require('path');
var babelRegister = require('babel-register');
var babelConfig = require('../../dev/babel-config');

babelRegister(babelConfig);

var mocha = new Mocha({ useColors: true });


glob.sync(path.resolve(__dirname, '../specs') + '/**/*.js').forEach(function(filePath){
  if(/browser/.test(filePath)) { return; }
  mocha.addFile(filePath);
});

// Run the tests.
var runner = mocha.run(function(failures){
  process.on('exit', function () {
    process.exit(failures);  // exit with non-zero status if there were failures
  });
});

runner.on('end', function(){
  process.exit();
});

runner.on('fail', function(){
  process.exit(1);
});
