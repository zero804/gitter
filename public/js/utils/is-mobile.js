'use strict';

var memo;

module.exports = function() {
  if (typeof memo === 'undefined') {
    memo = document.body.classList.contains('mobile');
  }

  return memo;
};
