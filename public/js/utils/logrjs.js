/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
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

    req(['utils/log', 'utils/context'], function (logger, context) {
      var logging = context.env('logging');
      if(!logging) {
        try {
          logging = !!window.localStorage['_log_all'];
          if(!logging) logging = !!window.localStorage['_log_' + name];
        } catch(e) {
        }
      }

      function passthrough() {
        var a = Array.prototype.slice.apply(arguments);
        a[0] = dateString() + ' ' + name + " " + a[0];

        logger.apply(null, a);
      }

      onload(logging ? passthrough : function() {});
    });
  }
});