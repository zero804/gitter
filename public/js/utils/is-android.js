"use strict";


module.exports = (function() {

  return function(userAgentString) {
    var stringToTest = userAgentString || navigator.userAgent;
    return stringToTest.indexOf('Android') > -1;
  };

})();

