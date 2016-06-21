"use strict";
var platformDetect = require('utils/platformDetect');
var context = require('utils/context');

module.exports = (function() {


  // Set modifier keys for the OS

  switch(platformDetect()) {
    case 'Mac': return {
      cmd: '⌘',
      room: '⌘',
      gitter: 'ctrl'
    };
    case 'Windows': return {
      cmd: 'ctrl',
      room: '⇧',
      gitter: '⇧'
    };
    default: return { // Linux and other
      cmd: 'ctrl',
      room: '⇧',
      room2: 'alt',
      gitter: 'alt'
    };
  }


})();
