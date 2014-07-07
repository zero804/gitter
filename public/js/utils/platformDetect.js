define([], function() {
  "use strict";
  return function() {
    var stringToTest = navigator.platform;
    if (stringToTest.indexOf('Mac') >-1) return 'Mac';
    if (stringToTest.indexOf('Win') >-1) return 'Windows';
    if (stringToTest.indexOf('Linux') >-1) return 'Linux';
  };
});
