/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

/* Ensure that the last promise has returned a value */
exports.required = function(value) {
	if(!value) throw 404;
	return value;
};

/* Always return a given value from the promise */
exports.value = function(value) {
	return function() {
		return value;
	};
};


