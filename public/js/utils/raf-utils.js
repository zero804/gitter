'use strict';

var raf = require('./raf');

/* Animation-frame frequency debounce */
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

/* Only allow one instantiation per animation frame, on the trailing edge */
function throttle(fn, context) {
  var existing;

  return function() {
    if (existing) return;
    existing = raf(function() {
      existing = undefined;
      fn.call(context);
    });
  };
}

module.exports = {
  debounce: debounce,
  throttle: throttle
};
