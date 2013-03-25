/*jshint unused:true, browser:true*/
define([
], function() {
  "use strict";

  return {
    getLogger: function() {
      return {
        error: function(message, args) { console.error(message, args); },
        warn: function(message, args)  { console.warn(message, args); },
        info: function(message, args)  { console.info(message, args); },
        debug: function(message, args) { console.debug(message, args); }
      };
    }
  };

});
