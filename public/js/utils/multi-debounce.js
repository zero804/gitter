define([
  'underscore'
], function(_) {
  "use strict";

  return function(options, callback, context) {
    var lastValue;
    var mostRecent;

    var longThrottle = options && options.longThrottle || 800;
    var shortThrottle = options && options.shortThrottle || 400;

    var fastDebounce = _.throttle(function() {
      if(mostRecent !== lastValue) {
        lastValue = mostRecent;
        callback.call(context);
      }

    }, shortThrottle);

    var slowDebounce =  _.throttle(fastDebounce, longThrottle);

    return function(value) {
      mostRecent = value;

      if(mostRecent.length < 3) {
        slowDebounce();
      } else {
        fastDebounce();
      }
    };

  };


});
