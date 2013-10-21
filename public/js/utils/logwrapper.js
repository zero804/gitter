/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([], function() {
  "use strict";

  return function wrap(log, clazz) {
    var p = clazz.prototype;

    Object.keys(p).forEach(function(key) {
      var original = p[key];

      if(typeof original === 'function') {
        p[key] = function() {
          log('>>> ' + key);

          console.groupCollapsed();
          console.trace();

          var result = original.apply(this, arguments);
          if(result !== undefined) {
            log('<<< ' + key + ' < ', result);
          }
          console.groupEnd();

          return result;
        };
      }
    });
  };
});
