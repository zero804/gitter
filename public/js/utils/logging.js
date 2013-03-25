/*jshint unused:true, browser:true*/
define([
], function() {
  "use strict";

  return {
    getLogger: function() {
      return {
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug
      };
    }
  };

});
