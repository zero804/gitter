'use strict';

// A basic Math.sign for `0.10.x`
var sign = function(input) {
  if(input === 0) {
    return 0;
  }
  return input > 0 ? 1 : -1;
};

// Transforms 1/-1 or true/false
// into 1 or -1
var sanitizeDir = function(dir) {
  return (dir === false) ? -1 : sign(dir || 1);
};

sanitizeDir.FORWARDS = 1;
sanitizeDir.BACKWARDS = -1;

module.exports = sanitizeDir;
