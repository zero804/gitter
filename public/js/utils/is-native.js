define([], function() {
  "use strict";
  return function(userAgentString) {
    var stringToTest = userAgentString || navigator.userAgent;

    return stringToTest.toLowerCase().indexOf('gitter') >= 0;
  };
});
