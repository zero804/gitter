/*jshint unused:true, browser:true*/
define([
  'underscore'
], function(_) {
  "use strict";

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
});
