/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/platformDetect'
], function(platformDetect) {
  "use strict";

  // Set modifier keys for the OS

  switch(platformDetect()) {
    case 'Mac': return {
      cmd: '⌘',
      room: 'ctrl',
      gitter: 'ctrl'
    };
    case 'Windows': return {
      cmd: 'ctrl',
      room: 'alt',
      gitter: 'alt'
    };
    default: return { // Linux and other
      cmd: 'ctrl',
      room: '⇧',
      gitter: 'alt'
    };
  }

});
