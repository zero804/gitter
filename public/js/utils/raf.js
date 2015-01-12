'use strict';

var nativeRaf = window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame;

function shim(callback) {
  window.setTimeout(callback, 1000 / 60);
}

module.exports = nativeRaf && nativeRaf.bind(window) || shim;

