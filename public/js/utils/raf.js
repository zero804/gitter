'use strict';

var nativeRaf =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame;

var nativeCancel =
  window.cancelAnimationFrame ||
  window.webkitCancelAnimationFrame ||
  window.mozCancelAnimationFrame;

function shim(callback) {
  return window.setTimeout(callback, 1000 / 60);
}

function shimCancel(timeoutId) {
  window.clearTimeout(timeoutId);
}

module.exports = (nativeRaf && nativeRaf.bind(window)) || shim;
module.exports.cancel = (nativeCancel && nativeCancel.bind(window)) || shimCancel;
