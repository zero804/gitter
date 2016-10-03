'use strict';

var TYPES = ['like'].reduce(function(memo, reaction) {
  memo[reaction] = true;
  return memo;
}, {});

function isValid(reaction) {
  return TYPES[reaction] === true;
}

module.exports = {
  TYPES: TYPES,
  isValid: isValid
};
