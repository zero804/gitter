/*jshint unused:true */
define({
  load: function (name, req, onload, config) {
    "use strict";

    req(['utils/log'], function (logger) {
      onload(function() {
        var a = Array.prototype.slice.apply(arguments);
        a[0] = name + ": " + a[0];
        logger.apply(null, a);
      });
    });
  }
});