define([
  'underscore'
], function (_) {

  'use strict';

  /** TODO: would be great if we had an explanation for a slow and fast debounce?
   * function() creates closure for debouncer
   *
   * {object}     options  - the defaults
   * {function}   callback - function to be executed after debounce
   * {object}     context  - the context to be bound to the callback
   *
   * @return {function} - that determines what debounce to be called
   */
  return function (options, callback, context) {

    var lastValue, mostRecent;
    var longThrottle = options && options.longThrottle || 800;
    var shortThrottle = options && options.shortThrottle || 250;

    var executeCallback = function () {
      // if (mostRecent !== lastValue) {
        lastValue = mostRecent;
        callback.call(context);
      // }
    };

    var debounce = _.debounce(executeCallback, shortThrottle);
    // var fastDebounce = _.debounce(executeCallback, shortThrottle);
    // var slowDebounce = _.debounce(executeCallback, longThrottle);

    // this function is provided the event i.e. is an EventListener...
    return function (value) {
      mostRecent = value;
      // console.log('mostRecent:', mostRecent);
      // if (mostRecent.length === 0) return;
      debounce();

      // FIXME mostRecent.length is ALWAYS undefined.
      // if (mostRecent.length < 3) {
      //   slowDebounce();
      // } else {
      //   fastDebounce();
      // }
    };
  };
});
