/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/platformDetect'
], function(platformDetect) {
  "use strict";

  // Set modifier keys for the OS

  var keys;
  if (platformDetect() === 'Mac') {
    keys = {
      cmd: '⌘',
      gitter: 'ctrl'
    };
  }
  else { // Windows, Linux
    keys = {
      cmd: 'ctrl',
      gitter: 'alt'
    };
  }

  return keys;

});
