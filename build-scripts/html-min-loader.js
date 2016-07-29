'use strict';

// Loader adding a header
var htmlclean = require('htmlclean');

module.exports = function(source) {
  this.cacheable();

  var result = htmlclean(source, {
    protect: /\{\{.*?\}\}/g
  });

  return result;
};
