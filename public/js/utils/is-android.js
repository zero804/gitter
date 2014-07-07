define([], function() {
  "use strict";
  return function(userAgentString) {
    var stringToTest = userAgentString || navigator.userAgent;
    return stringToTest.indexOf('Android') > -1;
  };
});
