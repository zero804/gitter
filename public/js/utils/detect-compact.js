define(function() {
  "use strict";

  return function detectCompact() {
    return !!navigator.userAgent.match(/(iPhone|iPod|Android|BlackBerry)/);
  };

});
