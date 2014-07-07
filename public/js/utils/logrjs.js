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
      var logging = context && context.env('logging');
      if(!logging) {
        try {
          logging = !!window.localStorage['_log_all'];
          if(!logging) logging = !!window.localStorage['_log_' + name];
        } catch(e) {
        }
      }

      function logDetails(lgr) {
        return function() {
          var a = Array.prototype.slice.apply(arguments);
          a[0] = dateString() + ' ' + name + " " + a[0];

          lgr.apply(null, a);
        };
      }

      // For some reason require.js compilation fails when other logging functions are added
      // Works fine when using without compilation though
      //
      // // Expose log, log.warn and log.error with details (date and module)
      // var passthrough = logDetails(logger);
      // passthrough.warn = logDetails(logger.warn);
      // passthrough.error = logDetails(logger.error);
      //
      // // Only expose errors in production
      // var prodlog = function(){};
      // prodlog.warn = function(){};
      // prodlog.error = logger.error;

      var passthrough = logDetails(logger);
      var prodlog = function(){};

      onload(logging ? passthrough : prodlog);
    });
  }
});
