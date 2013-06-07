/* jshint node:true */
"use strict";

module.exports = function log(object) {
	var result = {};

  function proxy(methodName) {
    return function() {
      var a = Array.prototype.slice.call(arguments, 0);
      console.log('>>>> ' + methodName + '(' +
          a.map(function(arg) { if(typeof arg == 'function') return 'func'; return arg; })
            .join(',') + ')');

      return object[methodName].apply(object, a);
    };
  }

	for(var key in object) {
		if(result[key]) continue;

		var o = object[key];
		if(typeof o === 'function') {
      result[key] = proxy(key);

		} else {
			result[key] = o;
		}
	}

  return result;

};