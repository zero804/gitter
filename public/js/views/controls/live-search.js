"use strict";
var _ = require('underscore');

module.exports = (function() {


  return function(view, $el, method, options) {
    var lastValue;

    var longDebounceValue = options && options.longDebounce || 800;
    var shortDebounceValue = options && options.shortDebounce || 400;
    var immediate = options && options.immediate;

    var fastDebounce = _.debounce(function() {
      var currentValue = $el.val();

      if(currentValue !== lastValue) {
        lastValue = currentValue;
        if(_.isFunction(method)) {
          method.call(view, currentValue);
        } else {
          view[method](currentValue);
        }
      }

    }, shortDebounceValue);

    var slowDebounce = _.debounce(fastDebounce, longDebounceValue);

    var change = function(e) {
      var currentValue = e.target.value;

      if(immediate) {
        if(_.isFunction(immediate)) {
          immediate.call(view, currentValue);
        } else {
          view[immediate](currentValue);
        }
      }

      if(currentValue.length < 3) {
        slowDebounce();
      } else {
        fastDebounce();
      }

    }.bind(view);

    $el.on('change cut paste input', change);

    view.on('destroy', function() {
      $el.off('change cut paste input', change);
    });
  };



})();
