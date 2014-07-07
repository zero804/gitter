define([], function() {
  "use strict";

  return function wrap(log, clazz) {
    var p = clazz.prototype;

    Object.keys(p).forEach(function(key) {
      var original = p[key];

      if(typeof original === 'function') {
        p[key] = function() {
          log('>>> ' + key);

          var result = original.apply(this, arguments);
          if(result !== undefined) {
            log('<<< ' + key + ' < ', result);
          }

          return result;
        };
      }
    });
  };
});
