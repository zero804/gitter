'use strict';

var raf = require('./raf');

function debounce(fn, context) {
  var existing;

  return function() {
    if (existing) raf.cancel(existing);
    existing = raf(function() {
      existing = undefined;
      fn.call(context);
    });
  };
}

module.exports = {
  debounce: debounce
};
