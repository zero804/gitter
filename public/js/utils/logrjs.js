/*jshint unused:true */
define({
  load: function (name, req, onload/*, config*/) {
    "use strict";

    name = "" + name;
    while(name.length < 20) {
      name = name + " ";
    }

    function dateString() {
      function pad(d) {
        if(d < 10) return "0" + d;
        return d;
      }

      var d = new Date();
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())  + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }

    req(['utils/log'], function (logger) {
      onload(function() {
        var a = Array.prototype.slice.apply(arguments);
        a[0] = dateString() + ' ' + name + " " + a[0];

        logger.apply(null, a);
      });
    });
  }
});