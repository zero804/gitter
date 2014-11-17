"use strict";


module.exports = (function() {


  return function detectCompact() {
    return !!navigator.userAgent.match(/(iPhone|iPod|Android|BlackBerry)/);
  };


})();

