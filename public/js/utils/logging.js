/*jshint unused:true, browser:true*/
define([
  'underscore'
], function(_) {
  "use strict";

  if(console && console.error && (typeof console.error == "function")) {
    return {
      getLogger: function() {
        return {
          error: _.bind(console.error, console),
          warn: _.bind(console.warn, console),
          info: _.bind(console.info, console),
          debug: _.bind(console.debug, console)
        };
      }
    };
  }

  // No logger exists
  function noOp() {}

  return {
    getLogger: function() {
      return {
        error: noOp,
        warn: noOp,
        info: noOp,
        debug: noOp
      };
    }
  };

});
