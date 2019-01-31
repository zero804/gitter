'use strict';

module.exports = (function() {
  return function(userAgentString) {
    var stringToTest =
      userAgentString || (typeof navigator === 'object' && navigator.userAgent) || '';

    return stringToTest.toLowerCase().indexOf('gitter') >= 0;
  };
})();
