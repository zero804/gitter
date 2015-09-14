"use strict";


module.exports = (function() {
  var memo;

  return function() {
    if (typeof memo === 'undefined') {
      memo = document.body.classList.contains('mobile');
    }

    return memo;
  };

})();

