'use strict';



// Transforms 1/-1 or true/false
// into 1 or -1
var sanitizeDir = function(dir) {
  return (dir === false) ? -1 : Math.sign(dir || 1);
};

sanitizeDir.FORWARDS = 1;
sanitizeDir.BACKWARDS = -1;

module.exports = sanitizeDir;
