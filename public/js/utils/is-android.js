"use strict";

module.exports = function(userAgentString) {
  var stringToTest = userAgentString || navigator.userAgent;
  return stringToTest.indexOf('Android') > -1;
};
