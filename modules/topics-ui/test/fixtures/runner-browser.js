/*global mocha*/
/*eslint-env node, browser */
"use strict";

//Import mocha css
require('mochaCss'); /* eslint-disable no-unpublished-require no-missing-require */

//Import global mocha object
require('mocha');

//Setup global describe/it functions
mocha.setup('bdd');

//Import all of our test files
var requireAll = function(requireContext) {
  return requireContext.keys().map(requireContext);
};
requireAll(require.context('../specs', true, /^\.\/.*-test\.js$/));

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
