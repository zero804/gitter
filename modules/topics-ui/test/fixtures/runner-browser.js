/*global mocha*/
"use strict";

//Import mocha css
require('mochaCss');

//Import global mocha object
require('mocha');

//Setup global describe/it functions
mocha.setup('bdd');

//Import all of our test files
var requireAll = function(requireContext) {
  return requireContext.keys().map(function(filePath){
    //Dont test server files in the browser
    if(/server/.test(filePath)) { return; }
    return requireContext(filePath);
  });
};
requireAll(require.context('../specs', true, /^\.\/.*-test\.js$/));
requireAll(require.context('../specs', true, /^\.\/.*-test\.jsx$/));

//Mocha config
mocha.allowUncaught();
mocha.checkLeaks();

//Throw errors
window.onerror = function(err) {
  console.error(err);
};

//Start mocha
window.onload = function(){
  mocha.run(function(){
    mocha.bail();
  });
};
