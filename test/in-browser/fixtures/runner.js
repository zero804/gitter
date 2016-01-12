'use strict';

var __karmaWebpackManifest__ = [];
var testsContext = require.context('../specs', true, /\.js$/);

function inManifest(path) {
  return __karmaWebpackManifest__.indexOf(path) >= 0;
}

var runnable = testsContext.keys().filter(inManifest);

if (!runnable.length) {
  runnable = testsContext.keys();
}

runnable.forEach(testsContext);
