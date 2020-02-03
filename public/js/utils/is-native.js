'use strict';
/**
 * Tests whether the user agent contains "gitter".
 */
module.exports = userAgentString => {
  const stringToTest =
    userAgentString || (typeof navigator === 'object' && navigator.userAgent) || '';

  return stringToTest.toLowerCase().indexOf('gitter') >= 0;
};
