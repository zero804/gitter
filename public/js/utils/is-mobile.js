/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([], function() {
  "use strict";
  return function(userAgentString) {
    var stringToTest = userAgentString || navigator.userAgent;
    return !!('ontouchstart' in document.documentElement) || stringToTest.indexOf('Mobile/') >= 0;
  };
});
